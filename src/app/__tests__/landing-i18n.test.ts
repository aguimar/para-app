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
      expect(enUS.landing, `en-US is missing landing.${section}`).toHaveProperty(section);
    }
  });

  it("en-US and pt-BR have the same landing keys", () => {
    const enKeys = flatKeys(enUS.landing as unknown as Record<string, unknown>).sort();
    const ptKeys = flatKeys(ptBR.landing as unknown as Record<string, unknown>).sort();
    expect(enKeys).toEqual(ptKeys);
  });

  it("no landing values are empty in en-US", () => {
    for (const key of flatKeys(enUS.landing as unknown as Record<string, unknown>)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = key.split(".").reduce((o: any, p) => o[p], enUS.landing);
      expect(val, `en-US landing.${key} is empty`).not.toBe("");
    }
  });

  it("no landing values are empty in pt-BR", () => {
    for (const key of flatKeys(ptBR.landing as unknown as Record<string, unknown>)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = key.split(".").reduce((o: any, p) => o[p], ptBR.landing);
      expect(val, `pt-BR landing.${key} is empty`).not.toBe("");
    }
  });
});
