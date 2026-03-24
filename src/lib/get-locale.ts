import { cookies } from "next/headers";
import { type Locale, defaultLocale, isLocale, getDictionary } from "./i18n";

export async function getLocaleFromCookies(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get("NEXT_LOCALE")?.value;
  return value && isLocale(value) ? value : defaultLocale;
}

export async function getDict() {
  const locale = await getLocaleFromCookies();
  return getDictionary(locale);
}
