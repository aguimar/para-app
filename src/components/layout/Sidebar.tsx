"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Rocket, TreeStructure, Books, Archive, House, type Icon } from "@phosphor-icons/react";

interface SidebarProps {
  workspaceSlug: string;
  workspaceName: string;
}

const NAV_ITEMS = [
  { label: "Projects", Icon: Rocket, slug: "projects", color: "text-primary" },
  { label: "Areas", Icon: TreeStructure, slug: "areas", color: "text-secondary" },
  { label: "Resources", Icon: Books, slug: "resources", color: "text-tertiary" },
  { label: "Archive", Icon: Archive, slug: "archive", color: "text-outline" },
] as const;

export function Sidebar({ workspaceSlug, workspaceName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 bg-surface-container-low sticky top-0 shrink-0">
      <div className="flex flex-col h-full p-4 gap-2">
        {/* Brand */}
        <div className="px-3 py-5">
          <Link href="/dashboard">
            <h1 className="font-headline text-base font-black uppercase tracking-tighter text-on-surface">
              Second Brain
            </h1>
            <p className="mt-0.5 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              PARA Methodology
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
          Dashboard
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

        {/* Workspace name + user */}
        <div className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2">
          <UserButton />
          <span className="truncate font-label text-xs text-on-surface-variant">
            {workspaceName}
          </span>
        </div>
      </div>
    </aside>
  );
}
