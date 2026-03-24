import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { Sidebar } from "@/components/layout/Sidebar";
import Image from "next/image";
import Link from "next/link";

export default async function GuidePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      workspaces: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { slug: true, name: true },
      },
    },
  });

  const workspace = user?.workspaces[0];
  if (!workspace) redirect("/sign-in");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaceSlug={workspace.slug} workspaceName={workspace.name} />

      <main className="flex-1 overflow-y-auto bg-surface">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between bg-surface/80 px-8 backdrop-blur-md">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
            Como usar
          </h1>
          <a
            href="/guia-para.pdf"
            download
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 256 256"
            >
              <path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z" />
            </svg>
            Baixar PDF
          </a>
        </div>

        <div className="mx-auto max-w-3xl px-8 py-8 space-y-12">
          {/* Intro */}
          <section className="text-center">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Guia do Second Brain
            </p>
            <h2 className="mt-2 font-headline text-3xl font-bold text-on-surface">
              Organize seu conhecimento com o método PARA
            </h2>
            <p className="mt-3 text-on-surface-variant">
              Capture, processe e integre suas ideias num só lugar.
            </p>
          </section>

          {/* What is PARA */}
          <section>
            <SectionHeader number="01" title="O que é o PARA?" />
            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              O PARA é um método de organização criado por Tiago Forte que divide
              toda a sua informação em quatro categorias. O Second Brain
              implementa esse método num ambiente digital focado e tranquilo.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <ParaCard
                emoji="🎯"
                title="Projetos"
                description="Iniciativas com prazo e objetivo definidos. Têm início, meio e fim."
                color="bg-primary/8 border-primary/20"
                titleColor="text-primary"
              />
              <ParaCard
                emoji="🔄"
                title="Áreas"
                description="Responsabilidades contínuas sem prazo final. Requerem manutenção constante."
                color="bg-secondary/8 border-secondary/20"
                titleColor="text-secondary"
              />
              <ParaCard
                emoji="📚"
                title="Recursos"
                description="Tópicos de interesse e referência. Informações úteis que você coleciona."
                color="bg-tertiary/8 border-tertiary/20"
                titleColor="text-tertiary"
              />
              <ParaCard
                emoji="📦"
                title="Arquivo"
                description="Itens inativos das outras categorias. Projetos concluídos e notas antigas."
                color="bg-surface-container border-outline-variant/30"
                titleColor="text-on-surface-variant"
              />
            </div>
          </section>

          {/* Flow */}
          <section>
            <SectionHeader number="02" title="O fluxo do conhecimento" />
            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              Toda informação entra pela Inbox e depois é triada para uma das
              quatro categorias:
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <FlowStep label="📥 Captura" />
              <FlowArrow />
              <FlowStep label="📋 Inbox" />
              <FlowArrow />
              <FlowStep label="🔍 Triagem" />
              <FlowArrow />
              <FlowStep label="📂 PARA" />
            </div>
          </section>

          {/* Getting started */}
          <section>
            <SectionHeader number="03" title="Primeiros passos" />
            <div className="mt-6 space-y-4">
              <Step n={1} title="Crie sua conta" desc="Acesse a página inicial e faça o cadastro com seu e-mail ou conta Google." />
              <Step n={2} title="Workspace automático" desc="Ao criar a conta, um workspace pessoal é criado automaticamente." />
              <Step n={3} title="Explore o Dashboard" desc="Após o login, você cai direto no Dashboard com o inventário PARA, inbox, projetos ativos e notas recentes." />
              <Step n={4} title="Capture sua primeira nota" desc='Clique em "Nova nota" no Dashboard. Ela vai para a Inbox automaticamente.' />
              <Step n={5} title="Faça sua primeira triagem" desc="No painel da Inbox, arraste sua nota para a categoria adequada." />
            </div>
          </section>

          {/* Dashboard */}
          <section>
            <SectionHeader number="04" title="O Dashboard" />
            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              O Dashboard é o centro de comando do seu Second Brain. Mostra o inventário PARA com a contagem de itens em cada categoria, até 6 projetos ativos recentes e as 8 notas mais recentemente editadas.
            </p>
            <Screenshot src="/guide/01-dashboard.png" alt="Dashboard do Second Brain" caption="Dashboard — Inventário PARA, projetos ativos e notas recentes" />
            <Tip>
              O painel da Inbox no Dashboard permite arrastar notas diretamente para as zonas de Projeto, Área, Recurso ou Arquivo.
            </Tip>
          </section>

          {/* Notes */}
          <section>
            <SectionHeader number="05" title="Capturando notas" />
            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              Notas são a unidade fundamental do Second Brain. O editor suporta
              texto rico no estilo Notion: títulos, listas, tabelas, negrito,
              itálico e mais. Use o comando <Kbd>/</Kbd> para acessar opções de
              formatação.
            </p>
            <Screenshot src="/guide/06-note-editor.png" alt="Editor de notas" caption="Editor de notas — Conteúdo à esquerda, painel de propriedades à direita" />
            <div className="mt-4 space-y-2">
              <Feature label="Ícone personalizado" desc="Escolha um emoji para identificar visualmente a nota" />
              <Feature label="Tags" desc="Adicione etiquetas para facilitar a busca" />
              <Feature label="Anexos" desc="Faça upload de arquivos diretamente na nota" />
              <Feature label="Categoria" desc="Defina ou altere a categoria PARA pelo painel lateral" />
              <Feature label="Vínculo" desc="Conecte a nota a um Projeto, Área ou Recurso" />
              <Feature label="Status" desc="Marque como A Fazer, Em Progresso ou Concluído" />
            </div>
            <Tip>
              Salve com <Kbd>Ctrl</Kbd> + <Kbd>S</Kbd>. Capture rápido, refine depois!
            </Tip>
          </section>

          {/* Triage */}
          <section>
            <SectionHeader number="06" title="Triagem da Inbox" />
            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              A triagem é o processo de mover notas da Inbox para a categoria
              PARA correta. É o momento de decidir: &quot;onde isso se encaixa?&quot;
            </p>
            <div className="mt-4 space-y-2">
              <Feature label="Projeto" desc="Se está relacionada a uma meta com prazo definido" />
              <Feature label="Área" desc="Se é sobre uma responsabilidade contínua da sua vida" />
              <Feature label="Recurso" desc="Se é uma referência ou tópico de interesse" />
              <Feature label="Arquivo" desc="Se não é mais relevante agora, mas pode ser útil no futuro" />
            </div>
            <AiTip>
              Não sabe onde colocar? Clique no botão &quot;Sugerir&quot; em cada nota. A IA
              analisa o conteúdo e sugere a melhor categoria.
            </AiTip>
          </section>

          {/* Projects & Kanban */}
          <section>
            <SectionHeader number="07" title="Projetos e Kanban" />
            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              Cada projeto tem um quadro Kanban com três colunas para organizar
              o fluxo de conhecimento:
            </p>
            <Screenshot src="/guide/02-projects.png" alt="Página de Projetos" caption="Página de Projetos — Visualização em grid com status, prioridade e progresso" />
            <Screenshot src="/guide/03-kanban.png" alt="Quadro Kanban" caption="Quadro Kanban — Arraste notas entre Inbox/Captação, Em Progresso e Integrado/Arquivo" />
            <div className="mt-6 grid grid-cols-3 gap-3">
              <KanbanCol
                title="Inbox / Captação"
                color="bg-amber-50 border-amber-200"
                titleColor="text-amber-800"
                items={["Pesquisar referências", "Definir escopo"]}
              />
              <KanbanCol
                title="Em Progresso"
                color="bg-blue-50 border-blue-200"
                titleColor="text-blue-800"
                items={["Escrever conteúdo"]}
              />
              <KanbanCol
                title="Integrado / Arquivo"
                color="bg-emerald-50 border-emerald-200"
                titleColor="text-emerald-800"
                items={["Briefing pronto", "Wireframe feito"]}
              />
            </div>
            <div className="mt-4 space-y-2">
              <Feature label="Arraste notas" desc="Entre colunas para atualizar o status automaticamente" />
              <Feature label="Barra de progresso" desc="Calculada pela proporção de notas concluídas" />
              <Feature label="Status do projeto" desc="Ativo, Em Espera ou Concluído" />
            </div>
            <AiTip>
              Clique em &quot;Sugerir Tarefas&quot; no detalhe do projeto para que a IA
              sugira próximos passos.
            </AiTip>
          </section>

          {/* Areas */}
          <section>
            <SectionHeader number="08" title="Áreas de responsabilidade" />
            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              Áreas representam as responsabilidades contínuas da sua vida —
              coisas que você mantém, não conclui. Cada Área pode acumular
              projetos, recursos e notas vinculados.
            </p>
            <Screenshot src="/guide/04-areas.png" alt="Página de Áreas" caption="Página de Áreas — Cartões com contagem de projetos, recursos e notas" />
            <div className="mt-4 space-y-2">
              <Feature label="Saúde" desc="Alimentação, exercícios, exames" />
              <Feature label="Finanças" desc="Orçamento, investimentos, contas" />
              <Feature label="Carreira" desc="Desenvolvimento profissional, networking" />
            </div>
            <Tip>
              Mantenha entre 5 e 10 Áreas. Se tiver muitas, provavelmente algumas
              são Projetos disfarçados (têm prazo!) ou podem ser agrupadas.
            </Tip>
          </section>

          {/* Resources */}
          <section>
            <SectionHeader number="09" title="Recursos" />
            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              Recursos são a sua biblioteca de referência — tópicos que você
              estuda, coleciona ou consulta. Use tags para encontrá-los
              facilmente. Vincule a uma Área para manter o contexto.
            </p>
            <Screenshot src="/guide/05-resources.png" alt="Página de Recursos" caption="Biblioteca de Recursos — Lista indexada com ícones, descrições e contagem de notas" />
          </section>

          {/* Archive */}
          <section>
            <SectionHeader number="10" title="Arquivo" />
            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              O Arquivo é onde vão os itens inativos. Não é lixeira — é um
              depósito organizado para consulta futura. Projetos concluídos
              aparecem automaticamente aqui. Você pode reativar qualquer item
              mudando o status.
            </p>
          </section>

          {/* Tips */}
          <section>
            <SectionHeader number="11" title="Dicas e boas práticas" />
            <div className="mt-4 space-y-2">
              <Feature label="Capture tudo" desc="Não filtre na hora de capturar. Classifique depois" />
              <Feature label="Triagem diária" desc="Reserve 5 minutos por dia para processar a Inbox" />
              <Feature label="Revisão semanal" desc="Revise projetos ativos para manter o progresso" />
              <Feature label="Revisão mensal" desc="Revise Áreas e Arquivo para reativar ou arquivar" />
              <Feature label="Ícones e tags" desc="Facilitam reconhecimento visual e busca" />
              <Feature label="Inbox zerada" desc="O objetivo é manter a Inbox vazia!" />
            </div>
          </section>

          {/* Cycle */}
          <section className="pb-8 text-center">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <FlowStep label="📥 Capturar" />
              <FlowArrow />
              <FlowStep label="🔍 Classificar" />
              <FlowArrow />
              <FlowStep label="⚙️ Processar" />
              <FlowArrow />
              <FlowStep label="✅ Integrar" />
              <FlowArrow />
              <FlowStep label="📦 Arquivar" />
            </div>
            <p className="mt-8 text-xs text-on-surface-variant">
              Construído com base no método PARA de Tiago Forte.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

/* ── Helper components ────────────────────────────── */

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-outline-variant/30 pb-3">
      <span className="font-headline text-2xl font-bold text-primary/50">{number}</span>
      <h3 className="font-headline text-xl font-bold text-on-surface">{title}</h3>
    </div>
  );
}

function ParaCard({
  emoji,
  title,
  description,
  color,
  titleColor,
}: {
  emoji: string;
  title: string;
  description: string;
  color: string;
  titleColor: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <span className="text-2xl">{emoji}</span>
      <h4 className={`mt-2 font-headline text-base font-bold ${titleColor}`}>{title}</h4>
      <p className="mt-1 text-xs text-on-surface-variant leading-relaxed">{description}</p>
    </div>
  );
}

function FlowStep({ label }: { label: string }) {
  return (
    <span className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs font-semibold text-primary">
      {label}
    </span>
  );
}

function FlowArrow() {
  return <span className="text-lg text-primary/40">→</span>;
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
        {n}
      </div>
      <div>
        <p className="font-headline text-sm font-bold text-on-surface">{title}</p>
        <p className="mt-0.5 text-xs text-on-surface-variant">{desc}</p>
      </div>
    </div>
  );
}

function Feature({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-outline-variant/20 py-2.5">
      <span className="text-xs font-bold text-primary">›</span>
      <div>
        <span className="text-sm font-semibold text-on-surface">{label}</span>
        <span className="ml-1.5 text-sm text-on-surface-variant">— {desc}</span>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-r-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-xs text-amber-900 leading-relaxed">
      <strong className="font-semibold">Dica:</strong> {children}
    </div>
  );
}

function AiTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-r-lg border-l-4 border-primary bg-primary/5 px-4 py-3 text-xs text-primary leading-relaxed">
      <strong className="font-semibold">IA:</strong> {children}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-outline-variant/40 bg-surface-container px-1.5 py-0.5 font-mono text-[10px] font-semibold text-on-surface">
      {children}
    </kbd>
  );
}

function Screenshot({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-outline-variant/30 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
      <Image src={src} alt={alt} width={1280} height={800} className="w-full h-auto" />
      <p className="border-t border-outline-variant/20 bg-surface-container-low px-4 py-2.5 text-center text-[11px] italic text-on-surface-variant">
        {caption}
      </p>
    </div>
  );
}

function KanbanCol({
  title,
  color,
  titleColor,
  items,
}: {
  title: string;
  color: string;
  titleColor: string;
  items: string[];
}) {
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${titleColor}`}>
        {title}
      </p>
      <div className="mt-2 space-y-1.5">
        {items.map((item) => (
          <div
            key={item}
            className="rounded bg-white/80 px-2.5 py-1.5 text-[11px] text-on-surface shadow-sm"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
