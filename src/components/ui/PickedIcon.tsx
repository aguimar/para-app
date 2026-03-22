"use client";

import { ICON_REGISTRY } from "@/lib/icon-registry";

interface Props {
  name: string;
  size?: number;
  className?: string;
}

/** Renders a stored Phosphor icon name as the actual icon component. */
export function PickedIcon({ name, size = 20, className }: Props) {
  if (!name) return null;
  const Icon = ICON_REGISTRY[name];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
}
