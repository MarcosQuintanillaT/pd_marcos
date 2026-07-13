import type { Metadata } from "next";
import { TrashView } from "@/components/trash-view";

export const metadata: Metadata = { title: "Papelera" };

export default function TrashPage() {
  return <TrashView />;
}
