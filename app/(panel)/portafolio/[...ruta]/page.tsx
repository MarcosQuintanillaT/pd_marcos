import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SectionView } from "@/components/section-view";
import { findSection, findSubsection, sectionHref } from "@/lib/portfolio";

type Props = { params: Promise<{ ruta: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ruta } = await params;
  const section = findSection(ruta[0]);
  const subsection = section ? findSubsection(section, ruta[1]) : undefined;
  return { title: subsection ? `${subsection.code}. ${subsection.title}` : section ? `${section.code}. ${section.title}` : "Sección no encontrada" };
}

export default async function SectionPage({ params }: Props) {
  const { ruta } = await params;
  if (!ruta?.length || ruta.length > 2) notFound();
  const section = findSection(ruta[0]);
  if (!section) notFound();
  const subsection = ruta[1] ? findSubsection(section, ruta[1]) : undefined;
  if (ruta[1] && !subsection) notFound();
  if (section.code === "1" && subsection) redirect(sectionHref(section));
  return (
    <SectionView
      key={subsection?.code ?? section.code}
      section={section}
      subsection={subsection}
    />
  );
}
