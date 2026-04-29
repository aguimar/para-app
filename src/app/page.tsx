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
      <nav className="sticky top-0 z-50 border-b border-surface-container-high bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 font-headline text-base font-extrabold text-on-surface">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="truncate">Second Brain</span>
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
            className="shrink-0 rounded bg-on-surface px-4 py-2 text-sm font-semibold text-surface transition hover:opacity-90 sm:px-5"
          >
            {l.nav.cta}
          </Link>
        </div>
      </nav>

      <section className="mx-auto flex max-w-5xl flex-col items-start gap-10 px-4 pb-0 pt-12 sm:px-6 sm:pt-16 lg:flex-row lg:items-end">
        <div className="w-full max-w-xl shrink-0 pb-0 lg:w-96 lg:pb-14">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
            {l.hero.eyebrow}
          </p>
          <h1 className="font-headline text-4xl font-extrabold leading-tight text-on-surface sm:text-5xl lg:text-4xl">
            {l.hero.headlineLine1}
            <br />
            <span className="text-primary">{l.hero.headlineAccent}</span>{" "}
            {l.hero.headlineLine2}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-on-surface-variant">
            {l.hero.sub}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
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
        <div className="min-w-0 flex-1 self-stretch">
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
              className="block w-full min-w-[520px] sm:min-w-0"
              priority
            />
          </div>
        </div>
      </section>

      <section className="bg-on-surface py-16 text-center">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-inverse-primary">
            {l.pain.label}
          </p>
          <h2 className="font-headline text-3xl font-extrabold leading-snug text-surface">
            {l.pain.headline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-inverse-on-surface">
            {l.pain.body}
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 sm:flex sm:justify-center sm:gap-12">
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

      <section id="how-it-works" className="bg-surface py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
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

      <section id="features" className="bg-surface-container-low py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            {l.features.label}
          </p>
          <h2 className="mb-16 text-center font-headline text-3xl font-extrabold text-on-surface">
            {l.features.headline}
          </h2>

          <div className="mb-20 flex flex-col items-start gap-8 sm:items-center md:flex-row md:gap-10">
            <div className="shrink-0 md:w-72">
              <span className="inline-block rounded bg-primary-container px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
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

          <div className="mb-20 flex flex-col items-start gap-8 sm:items-center md:flex-row-reverse md:gap-10">
            <div className="shrink-0 md:w-72">
              <span className="inline-block rounded bg-secondary-container/30 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-secondary">
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

          <div className="flex flex-col items-start gap-8 sm:items-center md:flex-row md:gap-10">
            <div className="shrink-0 md:w-72">
              <span className="inline-block rounded bg-tertiary-container/30 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-tertiary">
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

      <section className="border-y border-secondary-container bg-secondary-container/10 py-16">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-10 px-4 sm:px-6 md:flex-row md:items-center">
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
          <div className="w-full max-w-72 shrink-0">
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

      <section className="bg-on-surface py-24 text-center">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <h2 className="font-headline text-3xl font-extrabold leading-snug text-surface sm:text-4xl">
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

      <footer className="bg-inverse-surface px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-headline text-sm font-bold text-inverse-on-surface">
            <span className="h-2 w-2 rounded-full bg-inverse-primary" />
            Second Brain · parahq.app
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-outline">
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
