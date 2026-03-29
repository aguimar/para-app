"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { WhatsappLogo, FloppyDisk, Check, ArrowLeft } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n-client";
import Link from "next/link";

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

  const [phone, setPhone] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const currentPhone = phone ?? user?.phone ?? "";

  async function handleSave() {
    const value = currentPhone.replace(/\D/g, "") || null;
    await updatePhone.mutateAsync({ phone: value });
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
        <section className="rounded-xl bg-surface-container-lowest p-6 shadow-[0_12px_40px_rgba(42,52,57,0.06)]">
          <div className="flex items-center gap-3 mb-4">
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

          <div className="space-y-2">
            <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              {labels.phoneLabel}
            </label>
            <div className="flex gap-3">
              <input
                type="tel"
                value={currentPhone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setSaved(false);
                }}
                placeholder={labels.phonePlaceholder}
                className="flex-1 rounded-xl bg-surface-container px-4 py-2.5 font-body text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
              />
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
              {labels.phoneHint}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
