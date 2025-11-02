# 🏗️ Lexsy Frontend Architecture Plan

## 📋 Overview

This document outlines the architecture for the Lexsy legal AI automation web application frontend. The application enables users to upload .docx legal documents, fill placeholders through an AI-powered conversational chat interface, and preview/download the completed documents.

---

## 🎨 Design System

### Color Palette

**Light Mode:**
- Primary: `#1e3a8a` (Deep Navy Blue) - Trust & Professionalism
- Secondary: `#3b82f6` (Bright Blue) - Interactive highlights
- Accent: `#10b981` (Emerald Green) - Success & Positivity
- Background: `#ffffff` (White) & `#f9fafb` (Slate Gray)
- Text: `#111827` (Dark Gray) & `#6b7280` (Medium Gray)
- Surface: `#ffffff` (Cards, elevated surfaces)

**Dark Mode:**
- Primary: `#3b82f6` (Bright Blue)
- Secondary: `#60a5fa` (Light Blue)
- Accent: `#34d399` (Light Emerald)
- Background: `#0f172a` (Slate 900) & `#1e293b` (Slate 800)
- Text: `#f1f5f9` (Slate 100) & `#cbd5e1` (Slate 300)
- Surface: `#1e293b` (Slate 800)

### Typography

- **Font Family**: Inter (primary), Roboto (fallback)
- **Base Font Size**: 16px
- **Heading Scale**:
  - H1: 32px / 700 weight
  - H2: 24px / 600 weight
  - H3: 20px / 600 weight
  - Body: 16px / 400 weight
  - Small: 14px / 400 weight

### Iconography

- **Library**: Material Symbols (outlined)
- **Size Scale**: 16px, 20px, 24px, 32px
- **Implementation**: Via Google Fonts Material Symbols

### Spacing & Elevation

- **Spacing Scale**: 4px base unit (Tailwind default)
- **Card Elevation**: 
  - Light mode: `shadow-md` (2px elevation)
  - Dark mode: `shadow-lg` (4px elevation) with subtle glow
- **Transitions**: 200ms ease-in-out for interactions

---

## 📁 File & Folder Structure

```
frontend/src/
├── main.tsx                    # App entry point
├── App.tsx                     # Main router component
├── App.css                     # Global app styles
├── index.css                   # Tailwind base styles
│
├── components/                 # Reusable UI components
│   ├── AppBar.tsx             # Top navigation bar with logo & theme toggle
│   ├── Button.tsx             # Accessible button component
│   ├── Card.tsx               # Material Design card container
│   ├── FileUpload.tsx         # File upload with drag & drop
│   ├── ProgressIndicator.tsx  # Loading/progress indicator
│   ├── ChatMessage.tsx        # Individual chat message bubble
│   ├── ChatInput.tsx          # Chat input field with send button
│   ├── TypingIndicator.tsx    # Animated typing indicator
│   ├── DocumentPreview.tsx    # Document preview container
│   └── ThemeToggle.tsx        # Light/dark mode toggle button
│
├── contexts/                   # React contexts
│   └── ThemeContext.tsx       # Theme management (light/dark mode)
│
├── hooks/                      # Custom React hooks
│   ├── useTheme.ts           # Theme hook wrapper
│   ├── useStreamingChat.ts   # SSE streaming chat hook
│   └── useDocumentAnalysis.ts # Document analysis API hook
│
├── services/                   # API & external services
│   └── api.ts                # Backend API client functions
│
├── pages/                      # Page components
│   ├── HomePage.tsx          # Landing page with company info & CTA
│   ├── UploadPage.tsx        # Document upload page
│   ├── ChatPage.tsx          # Conversational chat interface
│   └── PreviewPage.tsx       # Document preview & download page
│
├── types/                      # TypeScript type definitions
│   ├── document.ts           # Document-related types
│   ├── chat.ts               # Chat-related types
│   └── api.ts                # API response types
│
└── utils/                      # Utility functions
    ├── document.ts           # Document manipulation utilities
    ├── formatting.ts         # Text formatting helpers
    └── accessibility.ts     # A11y helper functions
```

---

## 🧩 Component Architecture

### Atomic Design Approach

**Atoms** (Smallest reusable components):
- `Button` - Accessible button with variants
- `Card` - Material Design card container
- `ThemeToggle` - Light/dark mode switcher

**Molecules** (Composed atoms):
- `FileUpload` - Drag & drop file uploader
- `ChatMessage` - Individual message bubble
- `ChatInput` - Input field with send button
- `TypingIndicator` - Animated loading indicator
- `ProgressIndicator` - Loading/progress bar

**Organisms** (Complex components):
- `AppBar` - Top navigation bar
- `DocumentPreview` - Document preview container

**Templates** (Page layouts):
- Page components (`HomePage`, `UploadPage`, `ChatPage`, `PreviewPage`)

---

## 🔄 Page Flows & Routing

### Routes

1. **`/`** - HomePage
   - Company introduction
   - Feature overview
   - "Start Now" CTA button

2. **`/upload`** - UploadPage
   - File upload interface
   - Progress indicator during analysis
   - Navigate to `/chat` on success

3. **`/chat`** - ChatPage
   - Streaming chat interface
   - Placeholder filling conversation
   - Navigate to `/preview` when complete

4. **`/preview`** - PreviewPage
   - Document preview (formatted)
   - Download as .docx
   - "Edit again" or "Start over" options

### State Management

- **Local State**: React hooks (`useState`, `useReducer`)
- **URL State**: React Router for navigation and sharing
- **Context**: Theme context for global theme state
- **No Global State Library**: Stateless design (per requirements)

---

## 🎯 Key Features & Implementation

### 1. Theme System
- **Implementation**: React Context + Tailwind `dark:` classes
- **Toggle**: Material Design icon button in AppBar
- **Persistence**: LocalStorage for user preference
- **Accessibility**: ARIA labels and semantic HTML

### 2. File Upload
- **Implementation**: HTML5 File API + FormData
- **Features**: Drag & drop, file validation, progress indicator
- **Accessibility**: Keyboard navigation, screen reader announcements
- **API**: `POST /api/analyze`

### 3. Streaming Chat
- **Implementation**: Server-Sent Events (SSE) via `fetch` with stream reading
- **Features**: 
  - Real-time message streaming
  - Typing indicator
  - Auto-scroll to latest message
  - Message history
- **Accessibility**: 
  - `aria-live` regions for streaming content
  - Keyboard navigation
  - Focus management
- **API**: `POST /api/chat?stream=true`

### 4. Document Preview & Download
- **Preview**: Render filled text with preserved formatting (plain text view initially, .docx download available)
- **Download**: Generate .docx file client-side using `docx` library or server-side via API
- **API**: `POST /api/fill` to generate filled text, then format as .docx

---

## ♿ Accessibility Compliance (WCAG 2.2 AA)

### Requirements Checklist

✅ **Keyboard Navigation**
- All interactive elements keyboard accessible
- Visible focus indicators (2px outline)
- Skip links for main content

✅ **Color Contrast**
- Text meets 4.5:1 contrast ratio (normal text)
- Large text meets 3:1 contrast ratio
- Interactive elements have sufficient contrast

✅ **Screen Readers**
- Semantic HTML (`<nav>`, `<main>`, `<header>`, `<footer>`)
- ARIA labels and roles where needed
- `aria-live` regions for streaming chat
- Alt text for icons/images

✅ **Focus Management**
- Logical tab order
- Focus trapping in modals (if any)
- Focus restoration on navigation

✅ **Responsive Design**
- Mobile-first approach
- Touch targets ≥ 44x44px
- Responsive typography and spacing

---

## 🚀 Technology Stack

- **Framework**: React 19.1.1 with TypeScript
- **Routing**: React Router v7.9.5
- **Styling**: Tailwind CSS v4.1.16
- **Icons**: Material Symbols (Google Fonts)
- **Document Handling**: `docx` library for .docx generation
- **Build Tool**: Vite 7.1.7
- **Language**: TypeScript 5.9.3

---

## 📝 Implementation Notes

1. **Stateless Design**: No authentication, no persistence. Each session is independent.

2. **Streaming Chat**: Uses native `fetch` with `ReadableStream` for SSE handling, with proper error handling and reconnection logic.

3. **Document Formatting**: Initial implementation will show plain text preview. .docx download will preserve formatting using the `docx` library or server-side rendering.

4. **Responsive Design**: Mobile-first breakpoints:
   - Mobile: < 640px
   - Tablet: 640px - 1024px
   - Desktop: > 1024px

5. **Error Handling**: Comprehensive error boundaries and user-friendly error messages.

6. **Performance**: Code splitting for routes, lazy loading for heavy components.

---

## ✅ Next Steps

1. ✅ Create architecture plan (this document)
2. Set up theme context and Material Design system
3. Build AppBar component with theme toggle
4. Implement HomePage with company info
5. Build UploadPage with file upload
6. Create ChatPage with streaming support
7. Implement PreviewPage with download functionality
8. Set up routing and navigation
9. Add accessibility features and testing
10. Final polish and responsive design refinements

---

*Generated: 2024*
*Last Updated: Architecture Planning Phase*

