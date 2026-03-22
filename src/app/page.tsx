import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-center">
      <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
        Second Brain
      </h1>
      <p className="mt-3 max-w-md font-body text-base text-on-surface-variant">
        Organize your knowledge with the PARA method. Projects, Areas,
        Resources, Archives — all in one quiet, focused workspace.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/sign-up"
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-ambient transition hover:bg-primary-dim"
        >
          Get started
        </Link>
        <Link
          href="/sign-in"
          className="rounded-full border border-outline-variant px-6 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
