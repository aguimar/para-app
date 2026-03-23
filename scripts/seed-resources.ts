import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const RESOURCES = [
  { icon: "🧠", title: "Psicologia", description: "Comportamento, cognição, emoções" },
  { icon: "💻", title: "Tecnologia", description: "IA, ferramentas, tendências" },
  { icon: "📐", title: "Design", description: "UI/UX, sistemas visuais, tipografia" },
  { icon: "📈", title: "Produtividade", description: "Métodos, sistemas, ferramentas" },
  { icon: "📚", title: "Livros", description: "Leituras, resenhas, citações" },
  { icon: "🎙️", title: "Podcasts", description: "Episódios salvos e referências" },
  { icon: "🌍", title: "Filosofia", description: "Estoicismo, existencialismo, ética" },
  { icon: "🍳", title: "Culinária", description: "Receitas, técnicas, restaurantes" },
  { icon: "💡", title: "Ideias Soltas", description: "Conceitos sem categoria ainda" },
  { icon: "🎵", title: "Música", description: "Playlists, artistas, referências" },
  { icon: "🏙️", title: "Viagens", description: "Destinos, roteiros, dicas" },
  { icon: "📷", title: "Fotografia", description: "Técnicas, inspiração, equipamentos" },
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
    for (const resource of RESOURCES) {
      const existing = await db.resource.findFirst({
        where: { workspaceId: workspace.id, title: resource.title },
      });
      if (existing) {
        console.log(`  ⏭  Skipped: ${resource.icon} ${resource.title}`);
        skipped++;
      } else {
        await db.resource.create({ data: { ...resource, tags: [], workspaceId: workspace.id } });
        console.log(`  ✓  Created: ${resource.icon} ${resource.title}`);
        created++;
      }
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
