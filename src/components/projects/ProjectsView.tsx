"use client";

import { useState } from "react";
import Link from "next/link";
import { SquaresFour, List, TreeStructure } from "@/components/ui/icons";
import { IconPicker } from "@/components/ui/IconPicker";
import { PickedIcon } from "@/components/ui/PickedIcon";
import { NewProjectButton } from "@/components/projects/NewProjectButton";
import { formatDate } from "@/lib/utils";
import { type ProjectPriority, type ProjectStatus } from "@/types";
import { useTranslation } from "@/lib/i18n-client";
import { ListFilter } from "@/components/ListFilter";

const PRIORITY_STYLES: Record<ProjectPriority, { badge: string; border: string; bar: string; dot: string }> = {
  HIGH:   { badge: "bg-error-container text-on-error-container",           border: "border-l-4 border-primary",   bar: "bg-primary",   dot: "bg-primary" },
  MEDIUM: { badge: "bg-secondary-container text-on-secondary-container",   border: "border-l-4 border-secondary", bar: "bg-secondary", dot: "bg-secondary" },
  LOW:    { badge: "bg-surface-container-highest text-on-surface-variant", border: "border-l-4 border-outline",   bar: "bg-outline",   dot: "bg-outline" },
};

const STATUS_BADGE: Record<ProjectStatus, string> = {
  ACTIVE:    "bg-primary-container text-on-primary-container",
  ON_HOLD:   "bg-tertiary-container text-on-tertiary-container",
  COMPLETED: "bg-surface-container-high text-on-surface-variant",
};

const STATUS_DICT_KEY: Record<ProjectStatus, "active" | "onHold" | "completed"> = {
  ACTIVE: "active",
  ON_HOLD: "onHold",
  COMPLETED: "completed",
};

type AreaSnippet = { id: string; title: string; icon: string } | null;

type ProjectItem = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  status: string | null;
  priority: string | null;
  progress: number;
  deadline: Date | null;
  _count: { notes: number };
  area: AreaSnippet;
};

interface Props {
  projects: ProjectItem[];
  workspaceId: string;
  workspaceSlug: string;
}

function GridCard({ project, workspaceSlug }: { project: ProjectItem; workspaceSlug: string }) {
  const t = useTranslation();
  const priority = (project.priority ?? "MEDIUM") as ProjectPriority;
  const status = (project.status ?? "ACTIVE") as ProjectStatus;
  const styles = PRIORITY_STYLES[priority];

  return (
    <div
      className={`group relative flex flex-col rounded-xl bg-surface-container-lowest p-6 shadow-ambient transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(42,52,57,0.10)] ${styles.border}`}
    >
      <div className="mb-4 relative z-10">
        <IconPicker
          entityType="project"
          entityId={project.id}
          currentIcon={project.icon}
          entityTitle={project.title}
          accentClass="text-primary"
          bgClass="bg-primary-container/20"
        />
      </div>

      <div className="flex flex-col flex-1">
        <div className="mb-4 flex items-start justify-between gap-2 flex-wrap">
          <span className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            {project.deadline ? `${t.projects.due} ${formatDate(project.deadline)}` : t.common.noDeadline}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`rounded px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[status]}`}>
              {t.projectStatus[STATUS_DICT_KEY[status]]}
            </span>
            <span className={`rounded px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}>
              {t.projectPriority[priority.toLowerCase() as "high" | "medium" | "low"]}
            </span>
          </div>
        </div>

        {project.area && (
          <Link
            href={`/${workspaceSlug}/areas/${project.area.id}`}
            className="relative z-10 mb-2 inline-flex items-center gap-1 rounded-full bg-secondary-container/60 px-2.5 py-0.5 font-label text-[10px] font-semibold text-secondary hover:bg-secondary-container transition-colors"
          >
            {project.area.icon
              ? <PickedIcon name={project.area.icon} size={11} />
              : <TreeStructure size={11} />}
            {project.area.title}
          </Link>
        )}

        <h3 className="mb-3 font-headline text-xl font-bold leading-snug text-on-surface group-hover:text-primary transition-colors">
          <Link href={`/${workspaceSlug}/projects/${project.id}`} className="before:absolute before:inset-0 before:z-0">
            {project.title}
          </Link>
        </h3>
        {project.description && (
          <p className="mb-8 line-clamp-2 font-body text-sm text-on-surface-variant">
            {project.description}
          </p>
        )}

        <div className="mt-auto">
          <div className="mb-2 flex justify-between font-label text-[11px] font-bold uppercase tracking-widest text-on-surface">
            <span>{t.projects.progress}</span>
            <span>{project.progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className={`h-full rounded-full transition-all ${styles.bar}`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ListRow({ project, index, workspaceSlug }: { project: ProjectItem; index: number; workspaceSlug: string }) {
  const t = useTranslation();
  const priority = (project.priority ?? "MEDIUM") as ProjectPriority;
  const status = (project.status ?? "ACTIVE") as ProjectStatus;
  const styles = PRIORITY_STYLES[priority];

  return (
    <div
      className="group grid items-center gap-x-4 border-b border-surface-container-high transition-colors hover:bg-surface-container-low"
      style={{ gridTemplateColumns: "44px 44px 1fr 80px 100px 120px 80px auto", margin: "0 -16px", padding: "12px 16px" }}
    >
      <span className="font-body text-sm font-light tabular-nums text-on-surface-variant transition-colors group-hover:text-primary self-center">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="self-center">
        <IconPicker
          entityType="project"
          entityId={project.id}
          currentIcon={project.icon}
          entityTitle={project.title}
          accentClass="text-primary"
          bgClass="bg-primary-container/20"
        />
      </div>

      <Link href={`/${workspaceSlug}/projects/${project.id}`} className="min-w-0 block">
        <div className="flex items-center gap-2">
          <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${styles.dot}`} />
          <h2 className="font-headline text-base font-bold text-on-surface transition-colors group-hover:text-primary truncate">
            {project.title}
          </h2>
        </div>
        {project.description && (
          <p className="mt-0.5 font-body text-xs font-light text-on-surface-variant truncate">
            {project.description}
          </p>
        )}
      </Link>

      {/* Status badge */}
      <div className="self-center">
        <span className={`rounded px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[status]}`}>
          {t.projectStatus[STATUS_DICT_KEY[status]]}
        </span>
      </div>

      {/* Area */}
      <div className="self-center">
        {project.area ? (
          <Link
            href={`/${workspaceSlug}/areas/${project.area.id}`}
            className="inline-flex items-center gap-1 font-label text-[10px] text-secondary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {project.area.icon
              ? <PickedIcon name={project.area.icon} size={10} />
              : <TreeStructure size={10} />}
            <span className="truncate max-w-[70px]">{project.area.title}</span>
          </Link>
        ) : (
          <span className="font-label text-[10px] text-on-surface-variant opacity-40">—</span>
        )}
      </div>

      {/* Progress */}
      <div className="self-center">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className={`h-full rounded-full ${styles.bar}`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <span className="font-label text-[10px] tabular-nums text-on-surface-variant w-7 text-right">
            {project.progress}%
          </span>
        </div>
      </div>

      {/* Deadline */}
      <div className="self-center">
        <span className="font-label text-[10px] text-on-surface-variant">
          {project.deadline ? formatDate(project.deadline) : <span className="opacity-40">—</span>}
        </span>
      </div>

      {/* Note count + arrow */}
      <Link href={`/${workspaceSlug}/projects/${project.id}`} className="flex items-center gap-2 self-center">
        <p className="font-headline text-lg font-light leading-none text-on-surface-variant">
          {project._count.notes}
        </p>
        <span className="font-body text-sm text-on-surface-variant opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100 group-hover:text-primary">
          →
        </span>
      </Link>
    </div>
  );
}

export function ProjectsView({ projects, workspaceId, workspaceSlug }: Props) {
  const t = useTranslation();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filteredProjects, setFilteredProjects] = useState<ProjectItem[]>(projects);

  const active = filteredProjects.filter((p) => (p.status ?? "ACTIVE") !== "COMPLETED");

  return (
    <>
      {/* Toggle bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-surface-container-low p-1">
            <button
              onClick={() => setView("grid")}
              className={`rounded-lg px-4 py-2 transition-colors ${view === "grid" ? "bg-surface-container-lowest text-primary shadow-ambient" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <SquaresFour size={20} />
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-lg px-4 py-2 transition-colors ${view === "list" ? "bg-surface-container-lowest text-primary shadow-ambient" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <List size={20} />
            </button>
          </div>
          <ListFilter items={projects} onFilter={(f) => setFilteredProjects(f as ProjectItem[])} />
        </div>
        <span className="font-label text-xs text-on-surface-variant">
          {active.length} {active.length === 1 ? t.projects.activeCount_one : t.projects.activeCount_other}
        </span>
      </div>

      {/* Grid view */}
      {view === "grid" && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {active.map((project) => (
              <GridCard key={project.id} project={project} workspaceSlug={workspaceSlug} />
            ))}
            <NewProjectButton workspaceId={workspaceId} variant="card" />
          </div>

        </>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="flex flex-col">
          {/* Column headers */}
          <div
            className="grid items-center gap-x-4 border-b border-surface-container-high pb-2 mb-1"
            style={{ gridTemplateColumns: "44px 44px 1fr 80px 100px 120px 80px auto" }}
          >
            <span /><span />
            <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t.para.project}</span>
            <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t.projects.status}</span>
            <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t.projects.area}</span>
            <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t.projects.progress}</span>
            <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t.projects.deadline}</span>
            <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">{t.projects.tasks}</span>
          </div>

          {active.map((project, i) => (
            <ListRow key={project.id} project={project} index={i} workspaceSlug={workspaceSlug} />
          ))}

        </div>
      )}

      {active.length === 0 && filteredProjects.length < projects.length && (
        <p className="py-12 text-center font-body text-sm text-on-surface-variant">
          {t.listFilter.noMatches}
        </p>
      )}
    </>
  );
}
