# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal placeholder at `/` with a full 8-section marketing landing page for parahq.app / Second Brain.

**Architecture:** Single React Server Component in `src/app/page.tsx` (keeps the existing Clerk auth redirect). All copy lives in the i18n dictionaries (`en-US.json` + `pt-BR.json`). No new dependencies — Tailwind v4 CSS tokens + `next/image` cover all styling and images.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind v4 (CSS-first), `next/image`, Clerk auth, existing i18n system (`getDict` / `getLocaleFromCookies`).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/__tests__/landing-i18n.test.ts` | Verify both dicts have matching landing keys and no empty values |
| Modify | `src/dictionaries/en-US.json` | Replace `landing` section with full set of copy strings |
| Modify | `src/dictionaries/pt-BR.json` | Same keys translated to pt-BR |
| Modify | `src/app/globals.css` | Add `html { scroll-behavior: smooth; }` |
| Modify | `src/app/page.tsx` | Full 8-section landing page RSC |

---

## Task 1: i18n strings + dictionary test

**Files:**
- Modify: `src/dictionaries/en-US.json`
- Modify: `src/dictionaries/pt-BR.json`
- Create: `src/app/__tests__/landing-i18n.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/__tests__/landing-i18n.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import enUS from "@/dictionaries/en-US.json";
import ptBR from "@/dictionaries/pt-BR.json";

const REQUIRED_SECTIONS = [
  "nav", "hero", "pain", "para", "features", "whatsapp", "cta", "footer",
] as const;

function flatKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null && !Array.isArray(v)
      ? flatKeys(v as Record<string, unknown>, key)
      : [key];
  });
}

describe("landing i18n", () => {
  it("en-US landing has all required sections", () => {
    for (const section of REQUIRED_SECTIONS) {
      expect(
        enUS.landing,
        `en-US is missing landing.${section}`,
      ).toHaveProperty(section);
    }
  });

  it("en-US and pt-BR have the same landing keys", () => {
    const enKeys = flatKeys(enUS.landing as unknown as Record<string, unknown>).sort();
    const ptKeys = flatKeys(ptBR.landing as unknown as Record<string, unknown>).sort();
    expect(enKeys).toEqual(ptKeys);
  });

  it("no landing values are empty in en-US", () => {
    const keys = flatKeys(enUS.landing as unknown as Record<string, unknown>);
    for (const key of keys) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = key.split(".").reduce((o: any, p) => o[p], enUS.landing);
      expect(val, `en-US landing.${key} is empty`).not.toBe("");
    }
  });

  it("no landing values are empty in pt-BR", () => {
    const keys = flatKeys(ptBR.landing as unknown as Record<string, unknown>);
    for (const key of keys) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = key.split(".").reduce((o: any, p) => o[p], ptBR.landing);
      expect(val, `pt-BR landing.${key} is empty`).not.toBe("");
    }
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
docker compose exec app npx vitest run src/app/__tests__/landing-i18n.test.ts
```

Expected: FAIL — "en-US is missing landing.nav" (the old dict has only `title/description/getStarted/signIn`).

- [ ] **Step 3: Replace the `landing` key in `src/dictionaries/en-US.json`**

Find the current `"landing": { ... }` block and replace it entirely with:

```json
"landing": {
  "nav": {
    "features": "Features",
    "howItWorks": "How it works",
    "cta": "Get started free"
  },
  "hero": {
    "eyebrow": "PARA method · Second Brain",
    "headlineLine1": "Your notes are everywhere.",
    "headlineAccent": "Your thinking",
    "headlineLine2": "should have a home.",
    "sub": "Second Brain organises your knowledge into Projects, Areas, Resources and Archives — so you find anything, forget nothing, and focus on what moves the needle.",
    "cta": "Get started free",
    "ghost": "See how it works",
    "footnote": "No credit card required · Works with WhatsApp"
  },
  "pain": {
    "label": "The problem",
    "headline": "Your inbox is a graveyard. Your notes are forgotten the moment you write them.",
    "body": "Bookmarks, meeting notes, article highlights, WhatsApp voice messages — scattered across a dozen apps with no structure. You save everything and find nothing.",
    "stat1Num": "26%",
    "stat1Label": "of work time spent searching for information",
    "stat2Num": "4+",
    "stat2Label": "apps the average knowledge worker uses for notes",
    "stat3Num": "80%",
    "stat3Label": "of saved notes never referenced again"
  },
  "para": {
    "label": "The solution",
    "headline": "One system. Four buckets. Everything in its place.",
    "sub": "The PARA method, created by Tiago Forte, is the simplest organising framework for knowledge workers. Second Brain is your dedicated app for it.",
    "pTitle": "Projects",
    "pDesc": "Active work with a deadline. Track progress, notes and tasks in one place.",
    "aTitle": "Areas",
    "aDesc": "Ongoing responsibilities with no end date — health, finances, team management.",
    "rTitle": "Resources",
    "rDesc": "Topics and reference material you want to keep — books, articles, research.",
    "arTitle": "Archive",
    "arDesc": "Completed or inactive items. Out of sight, never out of reach."
  },
  "features": {
    "label": "Features",
    "headline": "Everything your second brain needs",
    "f1Tag": "Projects",
    "f1Title": "Turn projects into kanban boards",
    "f1Desc": "Each project gets its own board. Drag tasks between stages, attach notes, and keep your work moving — no extra tool required.",
    "f2Tag": "Notes",
    "f2Title": "A rich editor that gets out of your way",
    "f2Desc": "Block-based editor with headings, checklists, code blocks and more. Write fast, link notes together, find everything with full-text search.",
    "f3Tag": "Resources",
    "f3Title": "Capture resources from anywhere",
    "f3Desc": "Save articles, books, podcasts and references directly into your resource library. Tag, annotate and retrieve with ease."
  },
  "whatsapp": {
    "badge": "WhatsApp integration",
    "headline": "Send a voice note. It lands in your Inbox.",
    "body": "Connect your WhatsApp to Second Brain. Every message you forward — text, voice, link or image — is transcribed and saved to your Inbox, ready to file into PARA.",
    "chatVoice": "🎙️ Voice message (0:32)",
    "chatForward": "Forward to Second Brain",
    "chatConfirm": "✅ Saved to Inbox"
  },
  "cta": {
    "headline": "Your second brain is one click away.",
    "sub": "Join early adopters building a quieter, more organised knowledge practice.",
    "btn": "Create your free account",
    "footnote": "No credit card · Cancel anytime"
  },
  "footer": {
    "privacy": "Privacy",
    "terms": "Terms",
    "contact": "Contact"
  }
}
```

- [ ] **Step 4: Replace the `landing` key in `src/dictionaries/pt-BR.json`**

Find `"landing": { ... }` and replace it entirely with:

```json
"landing": {
  "nav": {
    "features": "Funcionalidades",
    "howItWorks": "Como funciona",
    "cta": "Comece grátis"
  },
  "hero": {
    "eyebrow": "Método PARA · Second Brain",
    "headlineLine1": "Suas notas estão em todo lugar.",
    "headlineAccent": "Seu pensamento",
    "headlineLine2": "merece um lar.",
    "sub": "O Second Brain organiza seu conhecimento em Projetos, Áreas, Recursos e Arquivo — para que você encontre tudo, esqueça nada e foque no que importa.",
    "cta": "Comece grátis",
    "ghost": "Veja como funciona",
    "footnote": "Sem cartão de crédito · Funciona com WhatsApp"
  },
  "pain": {
    "label": "O problema",
    "headline": "Sua inbox é um cemitério. Suas notas são esquecidas no momento em que você as escreve.",
    "body": "Favoritos, notas de reunião, destaques de artigos, mensagens de voz do WhatsApp — espalhados por dezenas de apps sem estrutura. Você salva tudo e não encontra nada.",
    "stat1Num": "26%",
    "stat1Label": "do tempo de trabalho gasto buscando informações",
    "stat2Num": "4+",
    "stat2Label": "apps que o trabalhador médio usa para notas",
    "stat3Num": "80%",
    "stat3Label": "das notas salvas nunca são consultadas novamente"
  },
  "para": {
    "label": "A solução",
    "headline": "Um sistema. Quatro categorias. Tudo no lugar certo.",
    "sub": "O método PARA, criado por Tiago Forte, é o framework de organização mais simples para trabalhadores do conhecimento. O Second Brain é o app dedicado a ele.",
    "pTitle": "Projetos",
    "pDesc": "Trabalho ativo com prazo. Acompanhe progresso, notas e tarefas em um único lugar.",
    "aTitle": "Áreas",
    "aDesc": "Responsabilidades contínuas sem data de término — saúde, finanças, gestão de equipe.",
    "rTitle": "Recursos",
    "rDesc": "Tópicos e materiais de referência que você quer guardar — livros, artigos, pesquisas.",
    "arTitle": "Arquivo",
    "arDesc": "Itens concluídos ou inativos. Fora da vista, nunca fora do alcance."
  },
  "features": {
    "label": "Funcionalidades",
    "headline": "Tudo que seu segundo cérebro precisa",
    "f1Tag": "Projetos",
    "f1Title": "Transforme projetos em quadros kanban",
    "f1Desc": "Cada projeto tem seu próprio quadro. Arraste tarefas entre estágios, anexe notas e mantenha o trabalho fluindo — sem ferramentas extras.",
    "f2Tag": "Notas",
    "f2Title": "Um editor rico que sai do seu caminho",
    "f2Desc": "Editor em blocos com títulos, checklists, blocos de código e muito mais. Escreva rápido, vincule notas e encontre tudo com busca de texto completo.",
    "f3Tag": "Recursos",
    "f3Title": "Capture recursos de qualquer lugar",
    "f3Desc": "Salve artigos, livros, podcasts e referências diretamente na sua biblioteca. Marque, anote e recupere com facilidade."
  },
  "whatsapp": {
    "badge": "Integração com WhatsApp",
    "headline": "Mande um áudio. Ele cai na sua Inbox.",
    "body": "Conecte seu WhatsApp ao Second Brain. Cada mensagem que você encaminhar — texto, áudio, link ou imagem — é transcrita e salva na sua Inbox, pronta para arquivar no PARA.",
    "chatVoice": "🎙️ Mensagem de voz (0:32)",
    "chatForward": "Encaminhar para o Second Brain",
    "chatConfirm": "✅ Salvo na Inbox"
  },
  "cta": {
    "headline": "Seu segundo cérebro está a um clique de distância.",
    "sub": "Junte-se aos early adopters construindo uma prática de conhecimento mais organizada.",
    "btn": "Criar conta grátis",
    "footnote": "Sem cartão de crédito · Cancele quando quiser"
  },
  "footer": {
    "privacy": "Privacidade",
    "terms": "Termos",
    "contact": "Contato"
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
docker compose exec app npx vitest run src/app/__tests__/landing-i18n.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/dictionaries/en-US.json src/dictionaries/pt-BR.json src/app/__tests__/landing-i18n.test.ts
git commit -m "feat(landing): add i18n strings for full landing page (en-US + pt-BR)"
```

---

## Task 2: Add smooth scroll to globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add scroll-behavior to globals.css**

In `src/app/globals.css`, inside the `/* ─── Base styles ─── */` block, add after the `*, *::before, *::after` rule:

```css
html {
  scroll-behavior: smooth;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(landing): add smooth scroll behavior"
```

---

## Task 3: Build the landing page component

**Files:**
- Modify: `src/app/page.tsx`

This is a React Server Component. No `'use client'` directive. All sections are static markup. The existing Clerk auth redirect at the top is preserved.

- [ ] **Step 1: Replace `src/app/page.tsx` entirely with the following**

```tsx
import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDict } from "@/lib/get-locale";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const t = await getDict();
  const l = t.landing;

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-surface-container-high bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-headline text-base font-extrabold text-on-surface">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Second Brain
          </div>
          <div className="hidden gap-8 text-sm text-on-surface-variant sm:flex">
            <a href="#features" className="transition-colors hover:text-on-surface">
              {l.nav.features}
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-on-surface">
              {l.nav.howItWorks}
            </a>
          </div>
          <Link
            href="/sign-up"
            className="rounded bg-on-surface px-5 py-2 text-sm font-semibold text-surface transition hover:opacity-90"
          >
            {l.nav.cta}
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="mx-auto flex max-w-5xl items-end gap-10 px-6 pb-0 pt-16">
        <div className="w-96 shrink-0 pb-14">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
            {l.hero.eyebrow}
          </p>
          <h1 className="font-headline text-4xl font-extrabold leading-tight text-on-surface">
            {l.hero.headlineLine1}
            <br />
            <span className="text-primary">{l.hero.headlineAccent}</span>{" "}
            {l.hero.headlineLine2}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-on-surface-variant">
            {l.hero.sub}
          </p>
          <div className="mt-8 flex items-center gap-5">
            <Link
              href="/sign-up"
              className="rounded bg-on-surface px-6 py-3 text-sm font-semibold text-surface shadow-ambient transition hover:opacity-90"
            >
              {l.hero.cta}
            </Link>
            <a
              href="#how-it-works"
              className="text-sm text-on-surface-variant transition hover:text-on-surface"
            >
              {l.hero.ghost} →
            </a>
          </div>
          <p className="mt-4 text-xs text-outline-variant">{l.hero.footnote}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-t-xl border border-b-0 border-surface-container-highest shadow-[0_-4px_32px_rgba(0,83,219,0.08)]">
            <div className="flex items-center gap-1.5 border-b border-surface-container-high bg-surface-container-low px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#fda4af]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#fcd34d]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#6ee7b7]" />
            </div>
            <Image
              src="/guide/01-dashboard.png"
              alt="Second Brain dashboard"
              width={1280}
              height={800}
              className="block w-full"
              priority
            />
          </div>
        </div>
      </section>

      {/* ── PAIN ── */}
      <section className="bg-on-surface py-16 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-inverse-primary">
            {l.pain.label}
          </p>
          <h2 className="font-headline text-3xl font-extrabold leading-snug text-surface">
            {l.pain.headline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-inverse-on-surface">
            {l.pain.body}
          </p>
          <div className="mt-10 flex justify-center gap-12">
            {[
              { num: l.pain.stat1Num, label: l.pain.stat1Label },
              { num: l.pain.stat2Num, label: l.pain.stat2Label },
              { num: l.pain.stat3Num, label: l.pain.stat3Label },
            ].map(({ num, label }) => (
              <div key={num}>
                <div className="font-headline text-4xl font-extrabold text-inverse-primary">
                  {num}
                </div>
                <div className="mt-1 text-xs leading-snug text-outline">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARA EXPLAINER ── */}
      <section id="how-it-works" className="bg-surface py-20">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            {l.para.label}
          </p>
          <h2 className="text-center font-headline text-3xl font-extrabold text-on-surface">
            {l.para.headline}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed text-on-surface-variant">
            {l.para.sub}
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-primary-container p-6">
              <span className="font-headline text-3xl font-extrabold text-primary">P</span>
              <h3 className="mt-2 font-headline text-sm font-bold text-on-surface">
                {l.para.pTitle}
              </h3>
              <p className="mt-1 text-xs leading-snug text-on-surface-variant">
                {l.para.pDesc}
              </p>
            </div>
            <div className="rounded-lg border border-secondary-container bg-secondary-container/20 p-6">
              <span className="font-headline text-3xl font-extrabold text-secondary">A</span>
              <h3 className="mt-2 font-headline text-sm font-bold text-on-surface">
                {l.para.aTitle}
              </h3>
              <p className="mt-1 text-xs leading-snug text-on-surface-variant">
                {l.para.aDesc}
              </p>
            </div>
            <div className="rounded-lg border border-tertiary-container bg-tertiary-container/20 p-6">
              <span className="font-headline text-3xl font-extrabold text-tertiary">R</span>
              <h3 className="mt-2 font-headline text-sm font-bold text-on-surface">
                {l.para.rTitle}
              </h3>
              <p className="mt-1 text-xs leading-snug text-on-surface-variant">
                {l.para.rDesc}
              </p>
            </div>
            <div className="rounded-lg border border-surface-container-highest bg-surface-container-low p-6">
              <span className="font-headline text-3xl font-extrabold text-on-surface-variant">
                Ar
              </span>
              <h3 className="mt-2 font-headline text-sm font-bold text-on-surface">
                {l.para.arTitle}
              </h3>
              <p className="mt-1 text-xs leading-snug text-on-surface-variant">
                {l.para.arDesc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="bg-surface-container-low py-20">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            {l.features.label}
          </p>
          <h2 className="mb-16 text-center font-headline text-3xl font-extrabold text-on-surface">
            {l.features.headline}
          </h2>

          <div className="mb-20 flex flex-col items-center gap-10 sm:flex-row">
            <div className="shrink-0 sm:w-72">
              <span className="inline-block rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wide bg-primary-container text-primary">
                {l.features.f1Tag}
              </span>
              <h3 className="mt-3 font-headline text-xl font-extrabold text-on-surface">
                {l.features.f1Title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                {l.features.f1Desc}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <Image
                src="/guide/03-kanban.png"
                alt="Kanban board"
                width={800}
                height={500}
                className="w-full rounded-lg border border-surface-container-highest shadow-ambient"
              />
            </div>
          </div>

          <div className="mb-20 flex flex-col items-center gap-10 sm:flex-row-reverse">
            <div className="shrink-0 sm:w-72">
              <span className="inline-block rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wide bg-secondary-container/30 text-secondary">
                {l.features.f2Tag}
              </span>
              <h3 className="mt-3 font-headline text-xl font-extrabold text-on-surface">
                {l.features.f2Title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                {l.features.f2Desc}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <Image
                src="/guide/06-note-editor.png"
                alt="Note editor"
                width={800}
                height={500}
                className="w-full rounded-lg border border-surface-container-highest shadow-ambient"
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-10 sm:flex-row">
            <div className="shrink-0 sm:w-72">
              <span className="inline-block rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wide bg-tertiary-container/30 text-tertiary">
                {l.features.f3Tag}
              </span>
              <h3 className="mt-3 font-headline text-xl font-extrabold text-on-surface">
                {l.features.f3Title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                {l.features.f3Desc}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <Image
                src="/guide/05-resources.png"
                alt="Resources"
                width={800}
                height={500}
                className="w-full rounded-lg border border-surface-container-highest shadow-ambient"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── WHATSAPP ── */}
      <section className="border-y border-secondary-container bg-secondary-container/10 py-16">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-6 sm:flex-row">
          <div className="flex-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold text-on-secondary">
              <WhatsAppIcon />
              {l.whatsapp.badge}
            </span>
            <h2 className="mt-5 font-headline text-2xl font-extrabold leading-snug text-on-surface">
              {l.whatsapp.headline}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-on-surface-variant">
              {l.whatsapp.body}
            </p>
          </div>
          <div className="w-72 shrink-0">
            <div className="rounded-xl border border-surface-container-highest bg-surface p-4 shadow-ambient">
              <div className="mb-3 inline-block rounded-lg rounded-tl-none bg-surface-container-low px-3 py-2 text-sm text-on-surface">
                {l.whatsapp.chatVoice}
              </div>
              <div className="mb-3 flex justify-end">
                <span className="inline-block rounded-lg rounded-tr-none bg-[#dcf8c6] px-3 py-2 text-sm text-[#1a3a1a]">
                  {l.whatsapp.chatForward}
                </span>
              </div>
              <p className="text-center text-xs text-on-surface-variant">
                {l.whatsapp.chatConfirm}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-on-surface py-24 text-center">
        <div className="mx-auto max-w-xl px-6">
          <h2 className="font-headline text-4xl font-extrabold leading-snug text-surface">
            {l.cta.headline}
          </h2>
          <p className="mt-4 text-base text-inverse-on-surface">{l.cta.sub}</p>
          <Link
            href="/sign-up"
            className="mt-10 inline-block rounded bg-inverse-primary px-8 py-4 text-sm font-bold text-on-surface transition hover:opacity-90"
          >
            {l.cta.btn}
          </Link>
          <p className="mt-4 text-xs text-outline">{l.cta.footnote}</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-inverse-surface px-6 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2 font-headline text-sm font-bold text-inverse-on-surface">
            <span className="h-2 w-2 rounded-full bg-inverse-primary" />
            Second Brain · parahq.app
          </div>
          <div className="flex gap-6 text-xs text-outline">
            <span>{l.footer.privacy}</span>
            <span>{l.footer.terms}</span>
            <span>{l.footer.contact}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
```

- [ ] **Step 2: Build check inside Docker**

```bash
docker compose exec app npm run build 2>&1 | tail -20
```

Expected: build completes with no TypeScript or module errors. If there are type errors relating to `t.landing`, verify the JSON was updated correctly in Task 1.

- [ ] **Step 3: Start the dev server and verify visually**

```bash
/dev
```

Open `http://localhost:3000` in the browser (make sure you're signed out, or open an incognito window).

Verify each section top-to-bottom:
- [ ] Nav is sticky; "Get started free" and anchor links are visible
- [ ] Hero: headline renders with blue accent on "Your thinking", dashboard screenshot loads
- [ ] Pain: dark background, 3 stats visible
- [ ] PARA: 4 cards with correct colors (blue/green/amber/grey)
- [ ] Features: 3 alternating rows, screenshots load
- [ ] WhatsApp: green tint, chat bubble mockup visible
- [ ] CTA: dark background, blue button
- [ ] Footer: dark background, "Second Brain · parahq.app"
- [ ] Clicking "Features" and "How it works" in nav scrolls smoothly to the right section
- [ ] "Get started free" and "Create your free account" both navigate to `/sign-up`

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): build full 8-section marketing landing page"
```

---

## Task 4: Run full test suite

- [ ] **Step 1: Run all tests**

```bash
docker compose exec app npx vitest run
```

Expected: all tests pass, including the 3 new i18n tests from Task 1.

- [ ] **Step 2: Commit if tests pass (no changes needed)**

If everything is green, the landing page is complete.
