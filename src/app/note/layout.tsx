import { getDict } from "@/lib/get-locale";
import { DictionaryProvider } from "@/components/providers/DictionaryProvider";

export default async function NoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dictionary = await getDict();

  return (
    <DictionaryProvider dictionary={dictionary}>
      {children}
    </DictionaryProvider>
  );
}
