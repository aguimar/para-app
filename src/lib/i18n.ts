import "server-only";

export const locales = ["pt-BR", "en-US"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pt-BR";

const dictionaries = {
  "pt-BR": () => import("@/dictionaries/pt-BR.json").then((m) => m.default),
  "en-US": () => import("@/dictionaries/en-US.json").then((m) => m.default),
};

export const getDictionary = async (locale: Locale) => dictionaries[locale]();

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
