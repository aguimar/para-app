# Landing Page Design — parahq.app

**Date:** 2026-04-27  
**Status:** Approved  
**Product:** Second Brain (parahq.app)

---

## Overview

A marketing landing page replacing the current minimal placeholder at `/`. Targets two audiences simultaneously: knowledge workers unfamiliar with PARA (sell the problem first) and PARA-aware users looking for a dedicated tool (show the product fast). Primary language is English; pt-BR served via the existing i18n system.

---

## Visual Direction

- **Tone:** Light / Editorial — `#f7f9fb` background, `#2a3439` ink, Inter body + Manrope headings
- **Accent:** Primary blue `#0053db` for CTAs and highlights; PARA category colours (blue/green/amber/grey) in section-specific contexts
- **Screenshots:** Real product screenshots from `public/guide/` anchored throughout
- **Dark contrast breaks:** Pain section and final CTA use `#2a3439` background for rhythm

---

## Page Structure

Authenticated users are redirected to `/dashboard` (already implemented). The landing is shown only to unauthenticated visitors.

### 1. Nav (sticky)
- Logo: blue dot + "Second Brain" wordmark (Manrope 800)
- Links: Features · How it works (scroll anchors to `#features` and `#how-it-works`). Blog link omitted until a blog exists.
- CTA button: "Get started free" → `/sign-up`
- Sticky on scroll, subtle backdrop blur

### 2. Hero
- **Left column (copy):**
  - Eyebrow: `PARA method · Second Brain` (blue, uppercase)
  - Headline: *"Your notes are everywhere. Your thinking should have a home."* — "Your thinking" in `#0053db`
  - Subheadline: one sentence explaining PARA + the outcome (find anything, forget nothing)
  - Primary CTA: "Get started free" → `/sign-up` (matches nav CTA wording)
  - Ghost link: "See how it works →" (scrolls to features)
  - Footnote: "No credit card required · Works with WhatsApp"
- **Right column (visual):**
  - Browser-frame mockup (`border-radius` top only, `border-bottom: none`) containing `public/guide/01-dashboard.png`
  - Frame floats up from bottom of hero — no bottom padding on hero section

### 3. Pain (dark background `#2a3439`)
- Label: "The problem"
- Headline: *"Your inbox is a graveyard. Your notes are forgotten the moment you write them."*
- Body paragraph: 2–3 sentences about scattered knowledge across apps
- 3 stats row (illustrative industry figures — verify or replace with real citations before launch):
  - 26% of work time spent searching for information
  - 4+ apps the average knowledge worker uses for notes
  - 80% of saved notes never referenced again

### 4. PARA Explainer
- Label: "The solution"
- Headline: *"One system. Four buckets. Everything in its place."*
- Subtext: credit to Tiago Forte's PARA method; Second Brain is the dedicated app
- 4-column card grid:
  | Letter | Name | Colour | Description |
  |--------|------|--------|-------------|
  | P | Projects | Blue `#dbe1ff` | Active work with a deadline |
  | A | Areas | Green `#6ffbbe` tinted | Ongoing responsibilities |
  | R | Resources | Amber `#f8a010` tinted | Reference material |
  | Ar | Archive | Surface grey | Completed / inactive |

### 5. Features (alternating rows, `#f0f4f7` background)
Three feature rows, text and screenshot alternating left/right:

| Tag | Headline | Screenshot |
|-----|----------|-----------|
| Projects (blue) | "Turn projects into kanban boards" | `03-kanban.png` |
| Notes (green) | "A rich editor that gets out of your way" | `06-note-editor.png` |
| Resources (amber) | "Capture resources from anywhere" | `05-resources.png` |

Each row: coloured tag pill + Manrope 800 headline + 2-sentence body copy + screenshot with `border-radius: 8px` and subtle shadow.

### 6. WhatsApp Integration Highlight
- Subtle green-tinted background with green border top/bottom
- Left: green badge "WhatsApp integration" + headline *"Send a voice note. It lands in your Inbox."* + body copy explaining the flow
- Right: stylised chat bubble mockup showing a voice note being forwarded and appearing as a transcribed Inbox note

### 7. Final CTA (dark background `#2a3439`)
- Headline: *"Your second brain is one click away."*
- Subtext: social nudge ("Join early adopters…")
- CTA button: "Create your free account" → `/sign-up` — blue `#618bff` on dark
- Footnote: "No credit card · Cancel anytime"

### 8. Footer
- Logo + `parahq.app` wordmark (left)
- Links: Privacy · Terms · Contact (right) — these are placeholder links; Privacy and Terms pages should be created before public launch. If they don't exist yet, render as disabled spans initially.
- Background: `#0b0f10`

---

## i18n

All user-visible strings are added to both `src/dictionaries/en-US.json` and `src/dictionaries/pt-BR.json` under a `landing` key (expanding the existing 4 keys). The `LandingPage` server component uses `getDict()` as it already does today.

---

## Routing & Auth

- File: `src/app/page.tsx` — already does `redirect('/dashboard')` for authenticated users; keep that guard
- No new routes required; landing is the root `/`

---

## Implementation Notes

- Landing page is a **React Server Component** (no `'use client'`) — all sections are static markup
- Screenshots are `<img>` tags referencing `public/guide/*.png` (already present)
- No new dependencies required — Tailwind v4 + existing design tokens cover all styles
- Nav sticky behaviour: `position: sticky; top: 0` with `backdrop-filter: blur(8px)` and `z-index`
- Smooth scroll for anchor links via `scroll-behavior: smooth` on `<html>` (already set or add to globals.css)
- Add `id` attributes to each section (`#features`, `#how-it-works`) for nav anchor links
- `.superpowers/` should be added to `.gitignore` if not already present
