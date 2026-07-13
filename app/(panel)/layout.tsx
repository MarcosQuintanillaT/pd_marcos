import { PanelShell } from "@/components/panel-shell";
import { PortfolioProvider } from "@/components/portfolio-provider";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortfolioProvider>
      <PanelShell>{children}</PanelShell>
    </PortfolioProvider>
  );
}
