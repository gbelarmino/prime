"use client";

import { Calendar } from "primereact/calendar";
import type { CalendarProps } from "primereact/calendar";

/** Input base usado em formulários do painel (Calendar, Dropdown, etc.). */
export const DASHBOARD_FORM_INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white placeholder:text-white/25";

export const DASHBOARD_CALENDAR_INPUT_CLASS = `${DASHBOARD_FORM_INPUT_CLASS} rounded-r-none`;

/** Pass-through PrimeReact: ícone azul, painel escuro, título mês/ano com espaçamento. */
export const DASHBOARD_CALENDAR_PT = {
  panel: { className: "bg-[#071C33] border-white/10 shadow-2xl" },
  header: { className: "bg-transparent border-white/5 p-2" },
  title: { className: "text-white font-bold flex gap-2 justify-center" },
  dropdownButton: {
    root: {
      className:
        "bg-blue-600 border-none rounded-r-xl w-12 flex items-center justify-center",
    },
    icon: { className: "text-white text-lg" },
  },
};

export const DASHBOARD_CALENDAR_DEFAULTS = {
  dateFormat: "dd/mm/yy",
  showIcon: true,
  locale: "pt-BR",
  icon: "pi pi-calendar",
  pt: DASHBOARD_CALENDAR_PT,
} as const satisfies Partial<CalendarProps>;

export type DashboardCalendarProps = CalendarProps;

export function DashboardCalendar({
  className = "w-full",
  inputClassName = DASHBOARD_CALENDAR_INPUT_CLASS,
  ...props
}: DashboardCalendarProps) {
  return (
    <Calendar
      {...DASHBOARD_CALENDAR_DEFAULTS}
      className={className}
      inputClassName={inputClassName}
      {...props}
    />
  );
}
