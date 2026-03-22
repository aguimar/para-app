import { Tray, Rocket, TreeStructure, Books, Archive, type Icon } from "@phosphor-icons/react";
import { type ParaCategory } from "@/types";

export const PARA_ICONS: Record<ParaCategory, Icon> = {
  INBOX: Tray,
  PROJECT: Rocket,
  AREA: TreeStructure,
  RESOURCE: Books,
  ARCHIVE: Archive,
};
