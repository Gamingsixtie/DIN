# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- TypeScript 5.8.0 - Full codebase (frontend and backend)
- JSX/TSX - React components and Next.js pages

**Secondary:**
- JavaScript - PostCSS configuration

## Runtime

**Environment:**
- Node.js (version not explicitly specified in package.json, inferred from Next.js 16.1.0)

**Package Manager:**
- npm - Managing dependencies
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.0 - Full-stack React framework for routing, SSR, and API routes
- React 19.1.0 - UI library and component framework
- React DOM 19.1.0 - DOM rendering for React

**Styling:**
- Tailwind CSS 4.1.0 - Utility-first CSS framework for UI styling
- PostCSS 8.5.0 - CSS transformation pipeline

**Document/File Processing:**
- docx 9.6.0 - Generate and manipulate Word documents for export functionality
- mammoth 1.11.0 - Extract text from .docx and .doc files during import

## Key Dependencies

**Critical:**
- @anthropic-ai/sdk 0.78.0 - Anthropic Claude API client for AI-powered DIN mapping and analysis
  - Used for: generateDINMapping, generateCrossAnalyse, generateSectorIntegratie, generateProgrammaPlan, generateBatenprofiel, analyzeSectorPlan, suggestDINItem, createDINItem
  - Models: claude-sonnet-4-6 (default), claude-opus-4-6 (for complex tasks)
  - Server-side only (API routes in `src/app/api/`)

**Infrastructure:**
- @supabase/supabase-js 2.49.0 - Supabase client library for database and authentication
  - Connection via environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Client initialized in `src/lib/supabase.ts`

## Development Dependencies

**Linting & Formatting:**
- ESLint 9.0.0 - JavaScript/TypeScript linting
- eslint-config-next 16.1.0 - Next.js recommended ESLint configuration
- @eslint/eslintrc 3.3.0 - ESLint config utilities

**Type Safety:**
- TypeScript 5.8.0 - Language support
- @types/node 22.0.0 - Node.js type definitions
- @types/react 19.1.0 - React type definitions
- @types/react-dom 19.1.0 - React DOM type definitions

**Build Tools:**
- @tailwindcss/postcss 4.1.0 - Tailwind CSS PostCSS plugin

## Configuration

**Environment:**
- Environment variables configured via Next.js `.env.local` (not committed)
- Required variables:
  - `ANTHROPIC_API_KEY` - Anthropic API authentication (server-side)
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public, client-side)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public, client-side)

**Build:**
- `next.config.ts` - Next.js configuration (minimal, uses defaults)
- `tsconfig.json` - TypeScript compiler options
  - Target: ES2017
  - Module resolution: bundler
  - Path alias: `@/*` maps to `./src/*`
  - JSX: react-jsx
  - Strict mode enabled

**Styling:**
- `postcss.config.mjs` - PostCSS configuration with Tailwind CSS plugin

## Platform Requirements

**Development:**
- Node.js environment with npm
- Next.js dev server (`npm run dev`)

**Production:**
- Node.js 16.8+ (required by Next.js 16.1.0)
- Environment variables configured in deployment platform
- Deployment via `npm run build` and `npm start`
- Next.js standalone server or serverless runtime (Vercel, AWS Lambda, etc.)

## Build & Dev Commands

```bash
npm run dev     # Development server (http://localhost:3000)
npm run build   # Production build
npm start       # Start production server
npm run lint    # Run ESLint
```

---

*Stack analysis: 2026-03-30*
