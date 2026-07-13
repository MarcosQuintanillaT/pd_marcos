import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TrashView } from "@/components/trash-view";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = { title: "Papelera" };

export default async function TrashPage() {
  const demoMode =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (!demoMode) {
    const auth = await getAuthContext();
    if (!auth) redirect("/login?next=/portafolio/papelera");
    if (auth.rol !== "docente") redirect("/portafolio");
  }
  return <TrashView />;
}
