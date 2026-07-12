import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard";

export const metadata: Metadata = { title: "Resumen general" };
export default function PortfolioPage() { return <Dashboard />; }

