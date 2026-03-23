"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { AreaPicker } from "@/components/ui/AreaPicker";

interface Area { id: string; title: string; icon: string }

interface Props {
  resourceId: string;
  currentAreaId: string | null;
  areas: Area[];
}

export function ResourceAreaPicker({ resourceId, currentAreaId, areas }: Props) {
  const router = useRouter();
  const update = trpc.resource.update.useMutation({ onSuccess: () => router.refresh() });

  return (
    <AreaPicker
      currentAreaId={currentAreaId}
      areas={areas}
      isPending={update.isPending}
      onChange={(areaId) => update.mutate({ id: resourceId, areaId })}
    />
  );
}
