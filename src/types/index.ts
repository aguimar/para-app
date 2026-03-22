import { Tray, Rocket, TreeStructure, Books, Archive, type Icon } from "@phosphor-icons/react";

export type ParaCategory = "INBOX" | "PROJECT" | "AREA" | "RESOURCE" | "ARCHIVE";
export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED";
export type ProjectPriority = "HIGH" | "MEDIUM" | "LOW";

export const PARA_CATEGORIES: ParaCategory[] = [
  "INBOX",
  "PROJECT",
  "AREA",
  "RESOURCE",
  "ARCHIVE",
];

export const PARA_LABELS: Record<ParaCategory, string> = {
  INBOX: "Inbox",
  PROJECT: "Project",
  AREA: "Area",
  RESOURCE: "Resource",
  ARCHIVE: "Archive",
};

export const PARA_ICONS: Record<ParaCategory, Icon> = {
  INBOX: Tray,
  PROJECT: Rocket,
  AREA: TreeStructure,
  RESOURCE: Books,
  ARCHIVE: Archive,
};
