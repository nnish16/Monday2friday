# W.E.E.K.D.A.Y. Agent

> AI resume optimizer with dual personas: F.R.I.D.A.Y. for quick wins, M.O.N.D.A.Y. for strategic depth. Rewrites bullets, detects red flags, and boosts ATS scores.

[![CI](https://github.com/nnish16/Monday2friday/actions/workflows/ci.yml/badge.svg)](https://github.com/nnish16/Monday2friday/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)

## The Problem

Resume optimization is tedious. You know your bullets need metrics, action verbs, and ATS keywords — but rewriting 20 bullets while tailoring to a specific JD takes hours. Generic "resume review" tools give surface-level feedback without understanding the why.

## The Solution

W.E.E.K.D.A.Y. gives you two AI agents with different optimization strategies:

- **F.R.I.D.A.Y.** (Fast Results In Days After Yesterday) — quick, tactical rewrites focused on ATS optimization and metric insertion
- **M.O.N.D.A.Y.** (Master Of Narrative Development And Yields) — deep, strategic analysis focusing on career narrative and executive positioning

Both use the **AVCR Framework** (Action · Value · Context · Result) to score and rewrite every bullet on your resume.

## Features

- **AVCR scoring** — each bullet scored on action verb strength, context clarity, result specificity, and metric quantification
- **Multiple rewrite options** per bullet with AI rationale for each suggestion
- **Health score** (1–10) with detailed red flag detection
- **Optimization modes** — ATS keywords, metrics-focused, concise, technical depth, executive positioning
- **Summary optimizer** — tailored for hiring managers vs. recruiters
- **Skills analysis** — categorization + gap detection against the target role
- **Chat interface** — ask follow-up questions about your resume
- **Document upload** — supports PDF, DOCX, and plain text

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18 + Vite 5 |
| Language | TypeScript 5.2 |
| AI | Gemini 2.0 Flash (via OpenRouter) |
| PDF parsing | PDF.js |
| DOCX parsing | Mammoth |
| Styling | Tailwind CSS |

## Quick Start

```bash
git clone https://github.com/nnish16/Monday2friday.git
cd Monday2friday
npm install
echo "GEMINI_API_KEY=your_key_here" > .env.local
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and upload your resume.

## How It Works

```
Upload Resume (PDF/DOCX/text)
        │
        ▼
┌───────────────────┐
│   Parse Document  │  ← Mammoth (DOCX) / PDF.js (PDF)
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│  Health Score +   │  ← Gemini structured JSON output
│  Red Flag Scan    │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│  AVCR Analysis    │  ← Per-bullet scoring + rewrite options
│  (per bullet)     │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│  Summary + Skills │  ← Narrative optimization + gap analysis
│  Optimization     │
└───────────────────┘
```

## Roadmap

- [ ] Export optimized resume as DOCX/PDF
- [ ] Job description comparison mode
- [ ] Persistent storage (save sessions)
- [ ] A/B test different resume versions
- [ ] LinkedIn profile optimizer

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](LICENSE) — Nishant Sarang
