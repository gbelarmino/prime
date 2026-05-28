/** Estilos alinhados ao formulário de cliente (`ClienteCadastroForm`). */

export const CRM_QUAL_INPUT_CLASS =
  "w-full bg-white/5 border-white/10 text-white rounded-xl py-3 px-4 focus:border-blue-500 transition-all";

export const CRM_QUAL_LABEL_CLASS =
  "block text-xs font-bold uppercase tracking-widest text-white/40 mb-2 ml-1";

export const CRM_QUAL_ERROR_CLASS =
  "text-[10px] font-bold text-rose-400 mt-2 ml-1 uppercase tracking-tighter";

export const CRM_QUAL_DROPDOWN_PT = {
  input: { className: "text-white p-3" },
  trigger: { className: "text-white/40" },
  panel: { className: "bg-[#071C33] border-white/10" },
  item: { className: "text-white hover:bg-white/5" },
};

export const CRM_QUAL_CALENDAR_PT = {
  panel: {
    className: "bg-[#071C33] border-white/10 shadow-2xl overflow-hidden",
  },
  header: { className: "bg-transparent border-white/5 p-2" },
  title: {
    className:
      "w-full text-white font-bold flex flex-wrap items-center justify-center gap-2 mx-auto",
  },
  monthTitle: { className: "text-white" },
  yearTitle: { className: "text-white" },
  monthPicker: { className: "flex flex-wrap justify-center w-full max-w-full" },
  yearPicker: { className: "flex flex-wrap justify-center w-full max-w-full" },
  dropdownButton: {
    root: {
      className:
        "bg-blue-600 border-none rounded-r-xl w-12 flex shrink-0 items-center justify-center",
    },
    icon: { className: "text-white text-lg" },
  },
};
