"use client";

interface HeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export function Header({ title, actions }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b-0 bg-surface px-6">
      <h2 className="font-headline text-lg font-bold text-on-surface">
        {title}
      </h2>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
