import { DashboardBoasVindas } from "@/components/dashboard/DashboardBoasVindas";
import { pageTitle } from "@/lib/app-brand";

export const metadata = {
  title: pageTitle("Início"),
  description: "Página inicial do painel para corretores e imobiliárias.",
};

export default function DashboardInicioPage() {
  return <DashboardBoasVindas />;
}
