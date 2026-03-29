"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Rocket, TreeStructure, Books, Archive, House, Question, GearSix, type Icon } from "@phosphor-icons/react";
import { useTranslation } from "@/lib/i18n-client";
import { LocaleSwitcher } from "./LocaleSwitcher";

interface SidebarProps {
  workspaceSlug: string;
  workspaceName: string;
  locale: string;
}

export function Sidebar({ workspaceSlug, workspaceName, locale }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslation();

  const NAV_ITEMS = [
    { label: t.sidebar.projects, Icon: Rocket, slug: "projects", color: "text-primary" },
    { label: t.sidebar.areas, Icon: TreeStructure, slug: "areas", color: "text-secondary" },
    { label: t.sidebar.resources, Icon: Books, slug: "resources", color: "text-tertiary" },
    { label: t.sidebar.archive, Icon: Archive, slug: "archive", color: "text-outline" },
  ];

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 bg-surface-container-low sticky top-0 shrink-0">
      <div className="flex flex-col h-full p-4 gap-2">
        {/* Brand */}
        <div className="px-3 py-5">
          <Link href="/dashboard">
            <h1 className="font-headline text-base font-black uppercase tracking-tighter text-on-surface">
              {t.sidebar.brand}
            </h1>
            <p className="mt-0.5 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              {t.sidebar.subtitle}
            </p>
          </Link>
        </div>

        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/dashboard"
              ? "bg-surface-container-lowest text-on-surface shadow-ambient"
              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          )}
        >
          <House size={20} />
          {t.sidebar.dashboard}
        </Link>

        {/* PARA nav */}
        <div className="mt-2 flex-1 space-y-1">
          <p className="px-3 pb-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
            PARA
          </p>
          {NAV_ITEMS.map(({ label, Icon, slug, color }) => {
            const href = `/${workspaceSlug}/${slug}`;
            const active = pathname.startsWith(href);
            return (
              <Link
                key={slug}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-surface-container-lowest text-on-surface shadow-ambient"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                <Icon size={20} className={active ? color : ""} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* How to use */}
        <Link
          href="/guide"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/guide"
              ? "bg-surface-container-lowest text-on-surface shadow-ambient"
              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          )}
        >
          <Question size={20} className={pathname === "/guide" ? "text-primary" : ""} />
          {t.sidebar.guide}
        </Link>

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-surface-container-lowest text-on-surface shadow-ambient"
              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          )}
        >
          <GearSix size={20} className={pathname === "/settings" ? "text-primary" : ""} />
          {t.sidebar.settings ?? "Settings"}
        </Link>

        {/* Workspace name + user + locale */}
        <div className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2" suppressHydrationWarning>
          <UserButton />
          <span className="flex-1 truncate font-label text-xs text-on-surface-variant">
            {workspaceName}
          </span>
          <LocaleSwitcher currentLocale={locale} />
        </div>
      </div>
    </aside>
  );
}
