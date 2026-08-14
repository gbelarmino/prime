"use client";

import { Dropdown } from "primereact/dropdown";
import { cn } from "@/lib/utils";
import { PAISES_DDI, type PaisDdi } from "@/lib/ddi-paises";

type DdiSelectProps = {
  value: string;
  onChange: (ddi: string) => void;
  /** Marca a borda de vermelho quando o campo tem erro. */
  invalid?: boolean;
  className?: string;
  id?: string;
};

/**
 * Seletor de país/DDI. Existe porque o DDI é guardado num campo separado do número: sem escolha
 * explícita, `+351` era indistinguível de `+35` na releitura do cadastro.
 */
export function DdiSelect({ value, onChange, invalid, className, id }: DdiSelectProps) {
  return (
    <Dropdown
      id={id}
      value={value}
      onChange={(e) => onChange(e.value)}
      options={PAISES_DDI}
      optionLabel="nome"
      optionValue="ddi"
      filter
      filterBy="nome,ddi"
      filterPlaceholder="País ou DDI"
      valueTemplate={(pais: PaisDdi | null) =>
        pais ? (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden>{pais.bandeira}</span>
            <span>{pais.ddi}</span>
          </span>
        ) : (
          <span className="text-white/40">DDI</span>
        )
      }
      itemTemplate={(pais: PaisDdi) => (
        <span className="flex items-center gap-2">
          <span aria-hidden>{pais.bandeira}</span>
          <span className="flex-1">{pais.nome}</span>
          <span className="text-white/50">{pais.ddi}</span>
        </span>
      )}
      className={cn(
        "bg-white/5 border-white/10 rounded-xl",
        invalid && "border-rose-400/50",
        className,
      )}
      pt={{
        input: { className: "text-white p-3" },
        panel: { className: "bg-[#071C33] border-white/10" },
        item: { className: "text-white hover:bg-white/5" },
        filterInput: { className: "bg-white/5 border-white/10 text-white" },
      }}
    />
  );
}
