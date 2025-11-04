import express from "express";
import cors from "cors";
import multer from "multer";
import mammoth from "mammoth";
import dotenv from "dotenv";
import OpenAI from "openai";
import JSZip from "jszip";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.post("/api/analyze", upload.single("document"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { buffer, originalname } = req.file;

        // Load raw XML and extracted text
        const zip = await JSZip.loadAsync(buffer);
        const documentXml = await zip.file("word/document.xml").async("string");
        const mammothResult = await mammoth.extractRawText({ buffer });
        const extractedText = mammothResult.value || "";

        const MAX_CHUNK = 25000;
        let allPlaceholders = [];

        // Function to detect placeholders in one chunk
        const detectPlaceholders = async (text, xml, label = "full") => {
            const prompt = `
                 You are reviewing a legal or financial document template to find every location where a user must enter custom information.
            
                IMPORTANT: Examine the document from start to finish. Capture ALL fields at:
                - The BEGINNING (often includes parties and overview details)
                - The MIDDLE (contains operative contract terms)
                - The END (signature pages, boilerplate termination clauses, etc.)
            
                FIND EVERY FILLED-IN FIELD, INCLUDING (but not limited to):
                - Explicit placeholders like [___], {{name}}, [COMPANY NAME], [name], [title], [STATE OF INCORPORATION]
                - Blank lines or underscores (e.g., "______", "______________", or long blanks)
                - Financial terms and numeric inputs ("Post-Money Valuation Cap", "Purchase Amount", "Equity Percentage", etc.)
                - Signature blocks, including labeled lines such as "By:", "Name:", "Title:", "Address:", "Email:"
                - Date fields, jurisdiction fields, party name fields, company identifiers, payment fields, etc.
                - Labeled fields with spaces/underscores even if not bracketed (e.g., "Effective Date: ________", "Name: __________")
                - Any phrase followed by a blank or value placeholder (e.g., "Purchase Price: $[_____]", "Valuation Cap: $[_______]")
            
                ESSENTIAL REQUIREMENTS:
                - DO NOT skip over the signature pages or footer sections
                - Treat any labeled line or legal term followed by a blank/value as a placeholder

                Analyze based on the following sources:
                ${text}

                Return a JSON object:

                {
                    "placeholders": [
                        {
                            "key": "a unique key here (e.g. investor_name)",
                            "label": "Readable placeholder label (e.g. Investor Name)",
                            "type": "text | number | currency | date | email | address | signature",
                            "question": "1-2 sentence intuitive question to ask the user (e.g. What is the investor's name?)",
                            "originalPattern": "The exact placeholder found in the document (e.g. [Investor Name])",
                            "numberOfOccurrences": "How many times this placeholder appears in the full document"
                        }
                    ]
                }
            `;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0.3,
                messages: [
                    { role: "system", content: "You are a legal placeholder extractor. Only output valid JSON." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                max_tokens: 2000
            });

            let content = completion.choices[0].message.content || "";
            content = content.replace(/```json|```/g, "").trim();

            try {
                const parsed = JSON.parse(content);
                return parsed.placeholders || [];
            } catch {
                const sanitized = content.replace(/[\u0000-\u001f]/g, "");
                const parsed = JSON.parse(sanitized);
                return parsed.placeholders || [];
            }
        };

        // Chunk the document if needed
        if (extractedText.length <= MAX_CHUNK && documentXml.length <= MAX_CHUNK) {
            allPlaceholders = await detectPlaceholders(extractedText, documentXml);
        } else {
            let start = 0;
            let idx = 0;
            const overlap = 1000;

            while (start < extractedText.length) {
                const textChunk = extractedText.slice(start, start + MAX_CHUNK);
                const xmlChunk = documentXml.slice(start, start + MAX_CHUNK);

                const chunkPlaceholders = await detectPlaceholders(textChunk, xmlChunk, `chunk_${idx}`);
                allPlaceholders.push(...chunkPlaceholders);

                start += (MAX_CHUNK - overlap);
                idx++;
            }
        }

        // Request a summary of the document
        const summaryPrompt = `Summarize this legal document in 2-3 sentences. Use general roles such as "the company" and "the investor".`;
        const summaryCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.4,
            max_tokens: 100,
            messages: [
                { role: "system", content: summaryPrompt },
                { role: "user", content: extractedText.slice(0, 2000) }
            ],
        });
        const documentSummary = summaryCompletion.choices[0].message.content.trim().replace(/[\n\r]+/g, " ");

        const htmlResult = await mammoth.convertToHtml({ buffer });

        let normalizedXml = documentXml;
        let normalizedText = extractedText;
        let normalizedHtml = htmlResult.value;

        allPlaceholders.forEach((p) => {
            const { originalPattern, key, numberOfOccurrences } = p;
            const occurrences = Number(numberOfOccurrences);

            if (!originalPattern || !key || isNaN(occurrences)) {
                return;
            }

            const replacement = `{{${key}}}`; // single key for all matches

            // Escape for exact text matching
            const escapedPattern = originalPattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
            const plainRegex = new RegExp(escapedPattern, "g");

            // XML boundary-tolerant
            const xmlRegex = createXmlBoundaryTolerantRegex(originalPattern);

            // Check if pattern exists before replacement
            const textMatches = normalizedText.match(plainRegex);
            const htmlMatches = normalizedHtml.match(plainRegex);
            const xmlMatches = normalizedXml.match(xmlRegex);

            if (!textMatches && !htmlMatches && !xmlMatches) {
                const flexiblePattern = originalPattern.replace(/[\[\]]/g, '').trim();
                const flexibleEscaped = flexiblePattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
                const flexibleRegex = new RegExp(flexibleEscaped.replace(/\s+/g, '\\s+'), "g");

                const textMatchesFlex = normalizedText.match(flexibleRegex);
                if (textMatchesFlex) {
                    normalizedText = replaceFirstNOccurrences(normalizedText, flexibleRegex, replacement, occurrences);
                }
                const htmlMatchesFlex = normalizedHtml.match(flexibleRegex);
                if (htmlMatchesFlex) {
                    normalizedHtml = replaceFirstNOccurrences(normalizedHtml, flexibleRegex, replacement, occurrences);
                }
            } else {
                normalizedText = replaceFirstNOccurrences(normalizedText, plainRegex, replacement, occurrences);
                normalizedHtml = replaceFirstNOccurrences(normalizedHtml, plainRegex, replacement, occurrences);
                normalizedXml = replaceFirstNOccurrences(normalizedXml, xmlRegex, replacement, occurrences);
            }
        });

        const response = {
            filename: originalname,
            extractedText,
            documentHtml: normalizedHtml,
            documentBuffer: buffer.toString('base64'),
            normalizedText: normalizedText,
            normalizedHtml: normalizedHtml,
            normalizedDocumentBuffer: buffer.toString('base64'),
            aiAnalysis: { fields: allPlaceholders },
            documentSummary,
            placeholderCount: allPlaceholders.length
        };

        zip.file("word/document.xml", normalizedXml);
        const normalizedDocumentBuffer = await zip.generateAsync({ type: "base64" });
        response.normalizedDocumentBuffer = normalizedDocumentBuffer;

        return res.json(response);

    } catch (err) {
        console.error(`[API] Error during analysis:`, err);
        return res.status(500).json({ error: "AI analysis failed" });
    }
});


// -------------------------------------------------------------
// 💬 Conversational Chat Assistant (Streaming + JSON mode)
// -------------------------------------------------------------
app.post("/api/chat", async (req, res) => {
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

        } else {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0.3,
                messages: [
                    { role: "system", content: systemPrompt },
                    ...(messages || []),
                ],
            });

            let content = completion.choices[0].message.content.trim();
            content = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");

            let responseJSON;
            try {
                responseJSON = JSON.parse(content);
            } catch {
                responseJSON = { message: content };
            }

            res.json(responseJSON);
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
    const format = req.query.format || "both";

    try {
        const { normalizedDocumentBuffer, normalizedHtml, normalizedText, fields } = req.body;

        if (!normalizedDocumentBuffer || !fields) {
            return res.status(400).json({ error: "Missing normalizedDocumentBuffer or fields" });
        }
        if (!normalizedHtml && (format === "preview" || format === "both")) {
            return res.status(400).json({ error: "Missing normalizedHtml for preview" });
        }

        // Load DOCX XML
        const base64Buf = Buffer.from(normalizedDocumentBuffer, "base64");
        const zip = await JSZip.loadAsync(base64Buf);
        const documentXml = await zip.file("word/document.xml").async("string");

        // ---------- 1) Extract placeholders (HTML + XML), including label-only ----------
        // We will scan <p> blocks in HTML and raw XML text runs. We produce ordered "occurrences".
        // An occurrence = { id, source: 'html'|'xml', start, end, snippetBefore, snippetAfter, labelGuess, hasDollar, kind, raw }
        const occurrences = [];

        // Utility: take context windows
        const ctx = (str, iStart, iEnd, w = 100) => ({
            before: str.slice(Math.max(0, iStart - w), iStart),
            after: str.slice(iEnd, iEnd + w),
        });

        // Patterns
        const BRACKET_RE = /\$?\s*\[[^\]]{0,80}\]/g;                 // [Company Name], $[_____], etc.
        const UNDERSCORE_RE = /\$?\s*[_\-—]{3,}/g;                   // ______, ----, ————
        // Label+blank (label can be followed by optional blank or nothing; still counts)
        const LABEL_WORDS = [
            "By", "Name", "Title", "Address", "Email", "Date",
            "Company Name", "Investor Name", "Purchase Amount", "Post-Money Valuation Cap",
            "State of Incorporation", "Governing Law Jurisdiction"
        ];
        const LABEL_ONLY_RE = new RegExp(
            `(?:^|[>\\s])(` +
            LABEL_WORDS.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
            `)\\s*:\\s*(?=$|[<\\n\\r])`, "g"
        );
        const LABEL_WITH_BLANK_RE = new RegExp(
            `(?:^|[>\\s])(` +
            LABEL_WORDS.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
            `)\\s*:\\s*(?:\\$?\\s*\\[[^\\]]{0,80}\\]|[_\\-—]{3,})`, "g"
        );

        let html = normalizedHtml || "";
        let xml = documentXml || "";

        // HTML: find [brackets], underscores, label-with-blank, and label-only
        const scanHtmlWith = (re, kind) => {
            let m;
            while ((m = re.exec(html)) !== null) {
                const start = m.index;
                const end = m.index + m[0].length;
                const { before, after } = ctx(html, start, end, 120);
                const raw = m[0];
                const labelGuess = (kind === "label_with_blank" || kind === "label_only") ? (m[1] || "").trim() : null;
                const hasDollar = /\$\s*$/.test(before) || /^\s*\$/.test(after) || /^\s*\$/.test(raw);
                occurrences.push({
                    source: "html",
                    start, end,
                    raw,
                    kind,
                    labelGuess,
                    hasDollar,
                    snippetBefore: before,
                    snippetAfter: after
                });
            }
        };

        scanHtmlWith(BRACKET_RE, "bracket");
        scanHtmlWith(UNDERSCORE_RE, "underscore");
        scanHtmlWith(LABEL_WITH_BLANK_RE, "label_with_blank");
        scanHtmlWith(LABEL_ONLY_RE, "label_only");

        // XML: run the same patterns (best-effort text-level)
        const scanXmlWith = (re, kind) => {
            let m;
            while ((m = re.exec(xml)) !== null) {
                const start = m.index;
                const end = m.index + m[0].length;
                const { before, after } = ctx(xml, start, end, 120);
                const raw = m[0];
                const labelGuess = (kind === "label_with_blank" || kind === "label_only") ? (m[1] || "").trim() : null;
                const hasDollar = /\$\s*$/.test(before) || /^\s*\$/.test(after) || /^\s*\$/.test(raw);
                occurrences.push({
                    source: "xml",
                    start, end,
                    raw,
                    kind,
                    labelGuess,
                    hasDollar,
                    snippetBefore: before,
                    snippetAfter: after
                });
            }
        };

        scanXmlWith(BRACKET_RE, "bracket");
        scanXmlWith(UNDERSCORE_RE, "underscore");
        scanXmlWith(LABEL_WITH_BLANK_RE, "label_with_blank");
        scanXmlWith(LABEL_ONLY_RE, "label_only");

        // Sort top-to-bottom within each source to preserve order
        const htmlOccs = occurrences.filter(o => o.source === "html").sort((a, b) => a.start - b.start);
        const xmlOccs = occurrences.filter(o => o.source === "xml").sort((a, b) => a.start - b.start);

        // Assign stable IDs (separate sequences for html and xml so we can replace reliably)
        htmlOccs.forEach((o, i) => o.id = `h${String(i + 1).padStart(4, "0")}`);
        xmlOccs.forEach((o, i) => o.id = `x${String(i + 1).padStart(4, "0")}`);

        const allOccs = [...htmlOccs, ...xmlOccs];

        // ---------- 2) Chunking + GPT mapping (occurrence -> field.key) ----------
        // Prepare fields with values only
        const fieldsWithValues = (fields || [])
            .map(f => ({ key: f.key, label: f.label || f.key, type: f.type || 'text', value: f.value || f.suggestion || '' }))
            .filter(f => f.value);

        // Build a light, safe view of occurrences for the prompt
        const lightOccs = allOccs.map(o => ({
            id: o.id,
            source: o.source,
            kind: o.kind,
            labelGuess: o.labelGuess,
            hasDollar: o.hasDollar,
            // Provide very small windows to keep token usage low but enough for context
            textWindow: `${(o.snippetBefore || '').slice(-90)}[BLANK]${(o.snippetAfter || '').slice(0, 90)}`
        }));

        const MAX_ITEMS_PER_CHUNK = 40; // keep prompts short; adjust if needed
        const chunks = [];
        for (let i = 0; i < lightOccs.length; i += MAX_ITEMS_PER_CHUNK) {
            chunks.push(lightOccs.slice(i, i + MAX_ITEMS_PER_CHUNK));
        }

        const mappingAggregate = {}; // id -> key

        for (let ci = 0; ci < chunks.length; ci++) {
            const chunk = chunks[ci];

            const mappingPrompt = `
  You map placeholder occurrences ("slots") in a legal document to the best user field keys.
  
  Return ONLY JSON like:
  { "h0001": "company_name", "x0007": "investor_email", ... }
  
  Guidance:
  - Use labelGuess, hasDollar, and the textWindow (surrounding context) to decide.
  - If two fields are similar, prefer the one whose label matches labelGuess or appears in textWindow.
  - Signature block hints:
    - "By:" usually expects a full name or signature name.
    - "Name:" expects a person or entity name.
    - "Title:" is a role like "CEO".
    - "Address:" is a mailing address.
    - "Email:" is an email address.
  - Currency fields often have hasDollar=true or context words like "Purchase Amount" or "Valuation Cap".
  
  Slots (ordered):
  ${JSON.stringify(chunk, null, 2)}
  
  Fields (with values):
  ${JSON.stringify(fieldsWithValues, null, 2)}
  `;

            try {
                const resp = await withTimeout(
                    openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        temperature: 0.1,
                        response_format: { type: "json_object" },
                        messages: [
                            { role: "system", content: "You precisely map each slot id to the best field.key. Return only JSON." },
                            { role: "user", content: mappingPrompt }
                        ],
                    }),
                    20000,
                    `GPT slot mapping chunk ${ci + 1}/${chunks.length}`
                );

                if (resp && !resp.__timeout && !resp.__error) {
                    let txt = resp.choices[0].message.content.trim().replace(/```json|```/g, "");
                    let parsed = {};
                    try { parsed = JSON.parse(txt); } catch {
                        const sanitized = txt.replace(/[\u0000-\u001f]/g, "");
                        parsed = JSON.parse(sanitized);
                    }
                    Object.assign(mappingAggregate, parsed);
                }
            } catch (e) {
                // Continue on error
            }
        }

        // ---------- 3) Build id -> value map ----------
        const valueByKey = Object.fromEntries(fieldsWithValues.map(f => [f.key, f.value]));
        const valueById = {};
        for (const occ of allOccs) {
            const key = mappingAggregate[occ.id];
            if (key && valueByKey[key] != null) {
                valueById[occ.id] = valueByKey[key];
            }
        }
        // ---------- 4) Fill HTML (brackets/underscores replaced; label-only appended) ----------
        let filledHtml = normalizedHtml || null;
        if (filledHtml && (format === "preview" || format === "both")) {
            // Replace from end to start to keep indices valid
            const htmlRepls = htmlOccs
                .filter(o => valueById[o.id])
                .sort((a, b) => b.start - a.start);

            for (const o of htmlRepls) {
                const valueEsc = (valueById[o.id] || "")
                    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

                if (o.kind === "label_only") {
                    // Insert " value" after "Label:"
                    // Match the specific label occurrence near this position
                    const label = o.labelGuess || "Value";
                    // Build a tolerant pattern anchored near the occurrence slice
                    const anchorSlice = filledHtml.slice(Math.max(0, o.start - 50), o.end + 50);
                    const localLabelRe = new RegExp(`(${label.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*:\\s*)(?!\\S)`);
                    const replaced = anchorSlice.replace(localLabelRe, `$1${valueEsc}`);
                    // splice back
                    filledHtml =
                        filledHtml.slice(0, Math.max(0, o.start - 50)) +
                        replaced +
                        filledHtml.slice(o.end + 50);
                } else if (o.kind === "label_with_blank" || o.kind === "bracket" || o.kind === "underscore") {
                    // Replace the blank itself with the value
                    const rawEsc = o.raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    const re = new RegExp(rawEsc, "g");
                    // Replace only the first hit nearest to o.start by slicing:
                    // safer than global replace to avoid changing earlier/other occurrences with same text
                    const head = filledHtml.slice(0, o.start);
                    const tail = filledHtml.slice(o.end);
                    filledHtml = head + valueEsc + tail;
                }
            }

            fieldsWithValues.forEach(field => {
                const placeholderPattern = new RegExp(`\\{\\{${field.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\}\\}`, 'g');
                if (placeholderPattern.test(filledHtml)) {
                    const valueEsc = (field.value || "")
                        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
                    filledHtml = filledHtml.replace(placeholderPattern, valueEsc);
                }
            });
        }

        // ---------- 5) Fill DOCX XML similarly ----------
        let filledDocxBase64 = null;
        if (format === "download" || format === "both") {
            let xmlOut = xml;

            const xmlRepls = xmlOccs
                .filter(o => valueById[o.id])
                .sort((a, b) => b.start - a.start);

            for (const o of xmlRepls) {
                const valEsc = (valueById[o.id] || "")
                    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

                if (o.kind === "label_only") {
                    const label = o.labelGuess || "Value";
                    // Insert the value after "Label:" locally
                    const anchor = xmlOut.slice(Math.max(0, o.start - 80), o.end + 80);
                    const localRe = new RegExp(`(${label.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*:\\s*)(?!\\S)`);
                    const replaced = anchor.replace(localRe, `$1${valEsc}`);
                    xmlOut = xmlOut.slice(0, Math.max(0, o.start - 80)) + replaced + xmlOut.slice(o.end + 80);
                } else {
                    // Replace the blank region with the value
                    const head = xmlOut.slice(0, o.start);
                    const tail = xmlOut.slice(o.end);
                    xmlOut = head + valEsc + tail;
                }
            }

            fieldsWithValues.forEach(field => {
                const placeholderPattern = createXmlBoundaryTolerantRegex(`{{${field.key}}}`);

                if (placeholderPattern.test(xmlOut)) {
                    const valEsc = (field.value || "")
                        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

                    xmlOut = xmlOut.replace(placeholderPattern, valEsc);
                }
            });

            zip.file("word/document.xml", xmlOut);
            filledDocxBase64 = await zip.generateAsync({ type: "base64" });
        }

        if (format === "download") {
            const blobBuffer = Buffer.from(filledDocxBase64 || "", "base64");
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            res.setHeader("Content-Disposition", `attachment; filename="filled-${Date.now()}.docx"`);
            return res.send(blobBuffer);
        } else {
            return res.json({
                filledHtml: filledHtml || null,
                filledDocx: filledDocxBase64 || null,
            });
        }
    } catch (err) {
        console.error(`[API] POST /api/download - ❌ Error:`, err.message);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Document fill failed" });
        }
    }
});



// Helper function to create XML boundary-tolerant regex
function createXmlBoundaryTolerantRegex(pattern) {
    // Escape special regex characters
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Split pattern into character groups that can span XML tags
    const chars = escaped.split('');
    // Create regex that allows XML tags between characters
    const regexParts = chars.map(char => {
        if (/[a-zA-Z0-9]/.test(char)) {
            // Allow XML tags before/after alphanumeric characters
            return `(?:<[^>]*>)*${char}(?:<[^>]*>)*`;
        }
        return char;
    });
    return new RegExp(regexParts.join(''), 'g');
}

// Helper function to replace first N occurrences
function replaceFirstNOccurrences(text, regex, replacement, maxOccurrences) {
    if (!text || !regex) return text;

    let count = 0;
    let result = text;

    // Ensure we have a global regex for matching, but we'll replace one at a time
    const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    const nonGlobalRegex = new RegExp(regex.source, regex.flags.replace('g', ''));

    // Find all matches first
    const allMatches = [];
    let match;
    while ((match = globalRegex.exec(text)) !== null && allMatches.length < maxOccurrences) {
        allMatches.push({
            index: match.index,
            length: match[0].length,
            text: match[0]
        });
        // Prevent infinite loop if regex doesn't advance
        if (match.index === globalRegex.lastIndex) {
            globalRegex.lastIndex++;
        }
    }

    // Replace from end to start to preserve indices
    for (let i = allMatches.length - 1; i >= 0; i--) {
        const m = allMatches[i];
        result = result.slice(0, m.index) + replacement + result.slice(m.index + m.length);
    }

    return result;
}

// Helper function to add timeout to promises
function withTimeout(promise, ms, label = 'operation') {
    return new Promise((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                resolve({ __timeout: true });
            }
        }, ms);
        promise
            .then((res) => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    resolve(res);
                }
            })
            .catch((err) => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    resolve({ __error: true, error: err });
                }
            });
    });
}

// -------------------------------------------------------------
// 🚀 Start Server
// -------------------------------------------------------------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`⚖️  Lexsy backend running on port ${PORT}`));
