import express from "express";
import cors from "cors";
import multer from "multer";
import mammoth from "mammoth";
import dotenv from "dotenv";
import OpenAI from "openai";
import JSZip from "jszip";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
// Increase body size limit to handle large base64-encoded document buffers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// -------------------------------------------------------------
// 🧾 Request logging middleware
// -------------------------------------------------------------
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] 📥 ${req.method} ${req.path}`);
    next();
});


// -------------------------------------------------------------
// 📄 Upload + Analyze Document (placeholders + summary)
// -------------------------------------------------------------
app.post("/api/analyze", upload.single("document"), async (req, res) => {
    const startTime = Date.now();
    console.log(`[API] POST /api/analyze - Document analysis request`);

    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { buffer, originalname, size } = req.file;
        console.log(`[API] POST /api/analyze - File received: ${originalname} (${size} bytes)`);

        // Extract both plain text (for AI) and HTML (for styled preview)
        const [textResult, htmlResult] = await Promise.all([
            mammoth.extractRawText({ buffer }),
            mammoth.convertToHtml({
                buffer,
                styleMap: [
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh",
                    "p[style-name='Heading 3'] => h3:fresh",
                    "p[style-name='Title'] => h1.title:fresh",
                    "r[style-name='Strong'] => strong",
                    "p[style-name='Quote'] => blockquote:fresh"
                ]
            })
        ]);
        const text = textResult.value;
        const documentHtml = htmlResult.value;
        console.log(`[API] POST /api/analyze - Text extracted: ${text.length} characters`);
        console.log(`[API] POST /api/analyze - HTML extracted: ${documentHtml.length} characters`);

        // Limit summary input to first 2000 chars
        const summaryInput = text.slice(0, 2000);


        const extractionPrompt = `
        You are reviewing a legal template to find every spot that must be filled in by a human.
        
        NON-NEGOTIABLE: Examine the FULL document. Capture items at:
        - The START of the file
        - The MIDDLE sections
        - The FINAL pages (signature pages are commonly overlooked)
        
        WHAT TO EXTRACT (include all that apply):
        - Explicit placeholders such as [___], {{name}}, [COMPANY NAME], [COMPANY], [name], [title]
        - Blank lines or underscored areas meant for input: ________ or long horizontal blanks
        - Any instruction-like text (e.g., "insert X here")
        - Labeled fields with lines or space after them (e.g., "Name:" followed by blanks)
        - Standard contract variables: party names, dates, amounts, governing law, addresses, emails, signatures, etc.
        - Signature blocks: entries like "By:", "Name:", "Title:", "Address:", "Email:" and any related lines underneath
        
        STRICT TASKING:
        - Do NOT miss the signature page(s) or anything near the very end
        - Treat labeled lines as fields even if no brackets/underscores are present
        - Count how many times each placeholder appears in the entire document (e.g., if “[Company Name]” shows up twice, numberOfOccurrences is "2")
        
        OUTPUT FORMAT (RETURN JSON ONLY):
        {
          "fields": [
            {
              "key": "snake_case_key",
              "label": "Readable label",
              "description": "Optional short note",
              "type": "text|number|currency|date|email|address|signature",
              "required": true|false,
              "originalPattern": "EXACT text including brackets/underscores as it appears in the doc",
              "exampleValue": "Example value",
              "legalSuggestions": "Short legal guidance",
              "numberOfOccurrences": "Number of occurrences of the placeholder in the document"
            }
          ]
        }
        
        JSON CONSTRAINTS:
        - Escape inner quotes using \\"
        - No tabs, newlines, or control characters inside strings
        - Output must be valid JSON (no comments, no trailing commas)
        - If nothing is found, respond with: { "fields": [] }
        `;

        const summaryPrompt = `Summarize the document in 2-3 sentences. Use generic roles (the company, the investor).`;

        const placeholderExtractionPromise = openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.3,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: extractionPrompt },
                { role: "user", content: text },
            ],
        });

        const summaryPromise = openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.4,
            max_tokens: 100,
            messages: [
                { role: "system", content: summaryPrompt },
                { role: "user", content: summaryInput },
            ],
        });

        // Run both requests in parallel
        const [placeholderExtraction, summaryCompletion] = await Promise.all([
            placeholderExtractionPromise,
            summaryPromise,
        ]);

        // Handle JSON safely
        let raw = placeholderExtraction.choices[0].message.content.trim();
        let parsedFields;
        try {
            parsedFields = JSON.parse(raw);
        } catch {
            parsedFields = { fields: [] };
        }

        const fields = parsedFields.fields || [];
        const documentSummary = summaryCompletion.choices[0].message.content.trim()
            .replace(/[\n\r]+/g, " ");

        // Create normalized versions
        const originalBufferBase64 = buffer.toString('base64');
        const zip = await JSZip.loadAsync(buffer);
        let documentXml = await zip.file("word/document.xml").async("string");

        let normalizedXml = documentXml;
        let normalizedText = text;
        let normalizedHtml = documentHtml;

        // // Normalize placeholders: replace only the FIRST match of each pattern sequentially
        // // This preserves visual order and prevents accidental duplicates in .docx XML
        // // Important: Process each field's pattern one at a time, replacing only the first occurrence
        // // before moving to the next field. This ensures correct visual order in the document.
        fields.forEach((field) => {
            const { originalPattern, key, numberOfOccurrences } = field;
            if (!originalPattern || !key) return;

            const escapedPattern = originalPattern.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
            const regex = new RegExp(escapedPattern, "g");

            // Replace ONLY the first N matches in docx XML
            normalizedXml = replaceFirstNOccurrences(
                normalizedXml,
                regex,
                `{{${key}}}`,
                Number(numberOfOccurrences)
            );

            // Same for text + html previews
            normalizedText = replaceFirstNOccurrences(
                normalizedText,
                regex,
                `{{${key}}}`,
                Number(numberOfOccurrences)
            );

            normalizedHtml = replaceFirstNOccurrences(
                normalizedHtml,
                regex,
                `{{${key}}}`,
                Number(numberOfOccurrences)
            );
        });


        // Recreate zip with normalized document.xml
        zip.file("word/document.xml", normalizedXml);
        const normalizedDocumentBuffer = await zip.generateAsync({ type: "base64" });

        // ✅ Response with new normalized outputs (keeping old fields too)
        const response = {
            filename: originalname,
            extractedText: text,
            documentHtml,
            documentBuffer: originalBufferBase64,
            normalizedText,
            normalizedHtml,
            normalizedDocumentBuffer,
            aiAnalysis: parsedFields,
            documentSummary,
            placeholderCount: fields.length,
        };

        const duration = Date.now() - startTime;
        console.log(`[API] POST /api/analyze - ✅ Success (${duration}ms)`);

        res.json(response);
    } catch (err) {
        console.error(`[API] POST /api/analyze - ❌ Error:`, err.message);
        res.status(500).json({ error: "AI analysis failed" });
    }
});

// -------------------------------------------------------------
// 💬 Conversational Chat Assistant (Streaming + JSON mode)
// -------------------------------------------------------------
app.post("/api/chat", async (req, res) => {
    const startTime = Date.now();
    const { messages, context } = req.body;
    const stream = req.query.stream === "true" || req.query.stream === "1";
    const { currentPlaceholderKey, lastQuestion, unfilledPlaceholders } = context || {};

    const systemPrompt = `
You are a helpful legal assistant for a contract-filling app. You have two possible tasks depending on user input:

1. If the user has responded with a value for a specific placeholder, help validate, normalize, and optionally improve the value. Respond using this JSON structure:
{
  "mode": "fill",
  "understood": true,
  "field": "placeholder key",
  "value": "normalized user value",
  "suggestion": "optional improved version",
  "reason": "short explanation if suggestion is made",
  "ack": "short confirmation",
  "needsClarification": false,
  "response": null
}

2. If the user is asking a general legal or document-related question, respond using:
{
  "mode": "chat",
  "understood": true,
  "field": null,
  "value": null,
  "suggestion": null,
  "reason": null,
  "ack": "short acknowledgment",
  "needsClarification": false,
  "response": "your general legal response"
}

Always return valid JSON using one of the above formats.

Context:
- Last question asked: "${lastQuestion || "none"}"
- Current placeholder being filled: "${currentPlaceholderKey || "unknown"}"
- Unfilled placeholders:
${JSON.stringify(unfilledPlaceholders || [], null, 2)}
  `;

    try {
        if (stream) {
            // --- STREAMING MODE (SSE) ---
            console.log(`[API] POST /api/chat - Streaming mode enabled`);
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("X-Accel-Buffering", "no");

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0.3,
                stream: true,
                messages: [
                    { role: "system", content: systemPrompt },
                    ...(messages || []),
                ],
            });

            for await (const chunk of completion) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }

            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
            console.log(`[API] POST /api/chat - ✅ Stream complete (${Date.now() - startTime}ms)`);

        } else {
            // --- NON-STREAMING MODE ---
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0.3,
                messages: [
                    { role: "system", content: systemPrompt },
                    ...(messages || []),
                ],
            });

            let content = completion.choices[0].message.content.trim();

            // Clean ```json fences if present
            content = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");

            let responseJSON;
            try {
                responseJSON = JSON.parse(content);
            } catch {
                // Fallback: return raw content so UI still renders AI response
                responseJSON = { message: content };
            }

            res.json(responseJSON);
            console.log(`[API] POST /api/chat - ✅ Success (${Date.now() - startTime}ms)`);
        }
    } catch (err) {
        console.error(`[API] POST /api/chat - ❌ Error:`, err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: "Chat failed" });
        } else {
            res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
        }
    }
});


// -------------------------------------------------------------
// 📥 Fill Document (for preview and download) - Uses normalized data
// Accepts normalized data from analyze API and returns both filled HTML and filled docx
// -------------------------------------------------------------

app.post("/api/download", async (req, res) => {
    const startTime = Date.now();
    const format = req.query.format || "both"; // "preview", "download", or "both" (default)
    console.log(`[API] POST /api/download - Document fill request (format: ${format})`);

    // Save full request to file for observation (with truncated buffers for readability)
    try {
        const requestData = {
            timestamp: new Date().toISOString(),
            format: format,
            fields: req.body.fields || [],
            normalizedDocumentBuffer: req.body.normalizedDocumentBuffer ? {
                length: req.body.normalizedDocumentBuffer.length,
                preview: req.body.normalizedDocumentBuffer.substring(0, 100),
                note: "Full buffer saved separately if needed"
            } : null,
            normalizedHtml: req.body.normalizedHtml ? {
                length: req.body.normalizedHtml.length,
                preview: req.body.normalizedHtml.substring(0, 500),
                note: "Full HTML saved separately if needed"
            } : null,
            normalizedText: req.body.normalizedText ? {
                length: req.body.normalizedText.length,
                preview: req.body.normalizedText.substring(0, 500),
                note: "Full text saved separately if needed"
            } : null,
            // Save full request body with buffers (for complete inspection)
            fullRequest: {
                fields: req.body.fields || [],
                // Include actual buffers for full inspection
                normalizedDocumentBuffer: req.body.normalizedDocumentBuffer,
                normalizedHtml: req.body.normalizedHtml,
                normalizedText: req.body.normalizedText,
            }
        };

        const fileName = `download_request_${Date.now()}.json`;
        const filePath = path.join(process.cwd(), fileName);
        fs.writeFileSync(filePath, JSON.stringify(requestData, null, 2));
        console.log(`[API] POST /api/download - 💾 Request saved to: ${fileName}`);
    } catch (fileErr) {
        console.error(`[API] POST /api/download - ⚠️ Failed to save request file:`, fileErr.message);
    }

    // Log request body (excluding full buffers to avoid huge logs)
    const logBody = {
        ...req.body,
        normalizedDocumentBuffer: req.body.normalizedDocumentBuffer ? `${req.body.normalizedDocumentBuffer.substring(0, 50)}... (${req.body.normalizedDocumentBuffer.length} chars)` : undefined,
        normalizedHtml: req.body.normalizedHtml ? `${req.body.normalizedHtml.substring(0, 100)}... (${req.body.normalizedHtml.length} chars)` : undefined,
        normalizedText: req.body.normalizedText ? `${req.body.normalizedText.substring(0, 100)}... (${req.body.normalizedText.length} chars)` : undefined
    };
    console.log(`[API] POST /api/download - Request JSON:`, JSON.stringify(logBody, null, 2));

    try {
        const { normalizedDocumentBuffer, normalizedHtml, normalizedText, fields } = req.body;

        if (!normalizedDocumentBuffer || !fields) {
            return res.status(400).json({ error: "Missing normalizedDocumentBuffer or fields" });
        }

        if (!normalizedHtml && (format === "preview" || format === "both")) {
            return res.status(400).json({ error: "Missing normalizedHtml for preview" });
        }

        console.log(`[API] POST /api/download - Processing ${fields.length} fields`);

        // Fill HTML for preview (if needed)
        let filledHtml = normalizedHtml;
        if (normalizedHtml && (format === "preview" || format === "both")) {
            let htmlReplacements = 0;

            for (const f of fields) {
                const normalizedPlaceholder = `{{${f.key}}}`;
                const value = f.value || f.suggestion || "";

                if (!f.key || !value) continue;

                // Escape HTML special characters in the replacement value
                const htmlValue = value
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;");

                const escapedPlaceholder = normalizedPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const regex = new RegExp(escapedPlaceholder, "g");
                const matches = (filledHtml.match(regex) || []).length;

                if (matches > 0) {
                    filledHtml = filledHtml.replace(regex, htmlValue);
                    htmlReplacements += matches;
                    console.log(`[API] POST /api/download - HTML: Replaced "${f.key}" (${matches} occurrence(s))`);
                }
            }
            console.log(`[API] POST /api/download - HTML replacements: ${htmlReplacements}`);
        }

        // Fill docx XML for download (if needed)
        let filledDocxBase64 = null;
        if (format === "download" || format === "both") {
            const buffer = Buffer.from(normalizedDocumentBuffer, "base64");
            const zip = await JSZip.loadAsync(buffer);
            const xml = await zip.file("word/document.xml").async("string");

            // Replace normalized placeholders ({{key}}) with final values
            // Use manual replacement instead of docxtemplater to handle tags split across XML boundaries
            let finalXml = xml;
            let totalReplacements = 0;

            for (const f of fields) {
                const normalizedPlaceholder = `{{${f.key}}}`;
                const value = f.value || f.suggestion || "";

                if (!f.key) continue;

                // Escape XML special characters in the value
                const escapedValue = (value || "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&apos;");

                // Replace all occurrences of {{key}} in the XML
                // This works even when tags are split across <w:t> elements
                const escapedPlaceholder = normalizedPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const regex = new RegExp(escapedPlaceholder, "g");
                const matches = finalXml.match(regex);

                if (matches && matches.length > 0) {
                    finalXml = finalXml.replace(regex, escapedValue);
                    totalReplacements += matches.length;
                    console.log(`[API] POST /api/download - Docx: Replaced "${f.key}" (${matches.length} occurrence(s))`);
                } else {
                    console.log(`[API] POST /api/download - ⚠️ No matches found for "${f.key}" (looking for "${normalizedPlaceholder}")`);
                }
            }

            // Save back into .docx zip structure
            zip.file("word/document.xml", finalXml);
            const modifiedBuffer = await zip.generateAsync({ type: "base64" });
            filledDocxBase64 = modifiedBuffer;

            console.log(`[API] POST /api/download - Total XML replacements: ${totalReplacements} placeholder(s)`);
        }

        const duration = Date.now() - startTime;
        console.log(`[API] POST /api/download - ✅ Success (${duration}ms)`);

        // Return based on format
        if (format === "download") {
            // Return blob directly for download
            const blobBuffer = Buffer.from(filledDocxBase64, "base64");
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            res.setHeader("Content-Disposition", `attachment; filename="filled-${Date.now()}.docx"`);
            res.send(blobBuffer);
        } else {
            // Return JSON with both filledHtml and filledDocx (base64)
            res.json({
                filledHtml: filledHtml || null,
                filledDocx: filledDocxBase64 || null,
            });
        }
    } catch (err) {
        console.error(`[API] POST /api/download - ❌ Error:`, err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: "Document fill failed" });
        }
    }
});

function replaceFirstNOccurrences(source, pattern, replacement, limit) {
    if (limit <= 0) return source;
    let count = 0;
    return source.replace(pattern, (match) => {
        if (count < limit) {
            count++;
            return replacement;
        }
        return match; // leave remaining matches untouched
    });
}

// -------------------------------------------------------------
// 🚀 Start Server
// -------------------------------------------------------------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`⚖️  Lexsy backend running on port ${PORT}`));
