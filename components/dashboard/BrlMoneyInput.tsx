"use client";

import { InputText } from "primereact/inputtext";
import { formatDigitsAsBrl, sanitizeMoneyDigits } from "@/lib/currency-brl";
import { cn } from "@/lib/utils";

export type BrlMoneyInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
  name?: string;
  placeholder?: string;
};

/** Campo monetário BR: milhares com ponto, decimais com vírgula (ex.: 1.234,56). */
export function BrlMoneyInput({
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  className,
  id,
  name,
  placeholder = "0,00",
}: BrlMoneyInputProps) {
  return (
    <InputText
      id={id}
      name={name}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      inputMode="decimal"
      autoComplete="off"
      className={cn("w-full tabular-nums", { "p-invalid": invalid }, className)}
      onChange={(e) => {
        onChange(formatDigitsAsBrl(sanitizeMoneyDigits(e.target.value)));
      }}
      onBlur={onBlur}
    />
  );
}
