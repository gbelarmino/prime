import { ImovelCadastroForm } from "@/components/dashboard/ImovelCadastroForm";

export default function NovoImovelPage() {
  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Cadastrar Novo Imóvel</h1>
          <p className="text-white/60">Preencha as informações do lote ou unidade para disponibilizar no estoque.</p>
        </header>
        
        <ImovelCadastroForm mode="create" />
      </div>
    </main>
  );
}
