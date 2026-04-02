"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { WhatsappLogo, FloppyDisk, Check, ArrowLeft } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n-client";
import Link from "next/link";

const BOT_NUMBER = "5585996488617";
const BOT_WA_URL = `https://wa.me/${BOT_NUMBER}`;
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(BOT_WA_URL)}&color=1a1a1a&bgcolor=ffffff&margin=8`;

function applyPhoneMask(digits: string): string {
  // digits = just numbers, no country code
  const d = digits.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function SettingsPage() {
  const t = useTranslation();
  const labels = t.settings ?? {
    title: "Settings",
    whatsappIntegration: "WhatsApp Integration",
    whatsappDescription: "Connect your WhatsApp number to capture notes by sending messages to yourself.",
    phoneLabel: "WhatsApp Number",
    phonePlaceholder: "e.g. 5585988645679",
    phoneHint: "Country code + number, digits only.",
    save: "Save",
    saved: "Saved!",
  };

  const { data: user, isLoading } = trpc.user.me.useQuery();
  const updatePhone = trpc.user.updatePhone.useMutation();

  // stored value is full number like "5585988645679"
  // local digits = without "55" prefix, for display
  const storedFull = user?.phone ?? "";
  const storedLocal = storedFull.startsWith("55") ? storedFull.slice(2) : storedFull;

  const [localDigits, setLocalDigits] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const currentDigits = localDigits ?? storedLocal;
  const maskedDisplay = applyPhoneMask(currentDigits);

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    setLocalDigits(digits);
    setSaved(false);
  }

  async function handleSave() {
    const digits = currentDigits.replace(/\D/g, "");
    const full = digits ? `55${digits}` : null;
    await updatePhone.mutateAsync({ phone: full });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <p className="text-on-surface-variant text-sm">{t.common?.loading ?? "Loading…"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="sticky top-0 z-10 flex h-14 items-center gap-4 bg-surface/80 px-8 backdrop-blur-md border-b border-outline-variant/10">
        <Link
          href="/dashboard"
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-headline text-xl font-bold tracking-tight text-on-surface">
          {labels.title}
        </h1>
      </div>

      <div className="mx-auto max-w-2xl px-8 py-10 space-y-10">
        {/* WhatsApp Integration */}
        <section className="rounded-xl bg-surface-container-lowest p-6 shadow-[0_12px_40px_rgba(42,52,57,0.06)] space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/15">
              <WhatsappLogo size={22} weight="fill" className="text-[#25D366]" />
            </div>
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">
                {labels.whatsappIntegration}
              </h2>
              <p className="font-body text-xs text-on-surface-variant">
                {labels.whatsappDescription}
              </p>
            </div>
          </div>

          {/* Add bot contact */}
          <div className="flex flex-col items-center gap-4 rounded-xl bg-surface-container p-5">
            <p className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Adicionar o assistente PARA
            </p>
            <img
              src={QR_URL}
              alt="QR Code para adicionar o assistente PARA no WhatsApp"
              width={160}
              height={160}
              className="rounded-lg"
            />
            <div className="text-center">
              <p className="font-body text-sm font-medium text-on-surface">Assistente Virtual — PARA</p>
              <a
                href={BOT_WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-xs text-[#25D366] hover:underline"
              >
                wa.me/{BOT_NUMBER}
              </a>
            </div>
            <a
              href={BOT_WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366]/15 px-5 py-2.5 font-label text-xs font-bold uppercase tracking-widest text-[#25D366] hover:bg-[#25D366]/25 transition-colors"
            >
              <WhatsappLogo size={14} weight="fill" />
              Abrir no WhatsApp
            </a>
          </div>

          {/* Phone number */}
          <div className="space-y-2">
            <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Seu número do WhatsApp
            </label>
            <div className="flex gap-3">
              <div className="flex flex-1 items-center rounded-xl bg-surface-container overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
                <span className="px-3 font-body text-sm text-on-surface-variant select-none border-r border-outline-variant/20 h-full flex items-center">
                  +55
                </span>
                <input
                  type="tel"
                  value={maskedDisplay}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder="(85) 99999-9999"
                  className="flex-1 bg-transparent px-3 py-2.5 font-body text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={updatePhone.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-container/40 px-5 py-2.5 font-label text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary-container/70 transition-colors disabled:opacity-50"
              >
                {saved ? (
                  <>
                    <Check size={14} weight="bold" />
                    {labels.saved}
                  </>
                ) : (
                  <>
                    <FloppyDisk size={14} />
                    {labels.save}
                  </>
                )}
              </button>
            </div>
            <p className="font-label text-[10px] text-on-surface-variant/70">
              DDD + número, sem o código do país.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
