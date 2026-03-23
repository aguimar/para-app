import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const AREAS = [
  { icon: "🏥", title: "Saúde" },
  { icon: "💼", title: "Trabalho" },
  { icon: "👨‍👩‍👧", title: "Família e Relacionamentos" },
  { icon: "💰", title: "Finanças" },
  { icon: "🌱", title: "Crescimento Pessoal" },
];

async function main() {
  const workspaces = await db.workspace.findMany({ select: { id: true, name: true } });

  if (workspaces.length === 0) {
    console.log("No workspaces found. Create a workspace first.");
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const workspace of workspaces) {
    console.log(`\nSeeding workspace: ${workspace.name}`);
    for (const area of AREAS) {
      const existing = await db.area.findFirst({
        where: { workspaceId: workspace.id, title: area.title },
      });
      if (existing) {
        console.log(`  ⏭  Skipped: ${area.icon} ${area.title}`);
        skipped++;
      } else {
        await db.area.create({ data: { ...area, workspaceId: workspace.id } });
        console.log(`  ✓  Created: ${area.icon} ${area.title}`);
        created++;
      }
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
