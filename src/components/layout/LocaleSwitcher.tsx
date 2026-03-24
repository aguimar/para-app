"use client";

interface Props {
  currentLocale: string;
}

export function LocaleSwitcher({ currentLocale }: Props) {
  function switchLocale(locale: string) {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;SameSite=Lax`;
    window.location.reload();
  }

  const nextLocale = currentLocale === "pt-BR" ? "en-US" : "pt-BR";
  const label = currentLocale === "pt-BR" ? "EN" : "PT";
  const flag = currentLocale === "pt-BR" ? "\u{1F1FA}\u{1F1F8}" : "\u{1F1E7}\u{1F1F7}";

  return (
    <button
      onClick={() => switchLocale(nextLocale)}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1 font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      title={nextLocale}
    >
      <span className="text-sm">{flag}</span>
      {label}
    </button>
  );
}
