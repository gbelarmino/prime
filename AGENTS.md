<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tabelas do dashboard (PrimeReact DataTable)

Para **novas listas/tabelas** no painel (`app/dashboard/**`), usar o padrão centralizado — não duplicar `pt` local nem classes ad hoc.

| Caso | Contentor | DataTable |
|------|-----------|-----------|
| Lista principal (Clientes, Fila, etc.) | `DashboardDataTableShell` ou `DASHBOARD_DATATABLE_SHELL_CLASS` | `className={DASHBOARD_DATATABLE_CLASS}` + `dashboardDataTablePt()` |
| Tabela dentro de card | `DASHBOARD_DATATABLE_INSET_SHELL_CLASS` no wrapper | `dashboardDataTablePt({ density: "compact", paginator: false })` |

**Ficheiros:** `lib/dashboard-datatable.tsx` (pt, células, badges), `components/dashboard/DashboardDataTableShell.tsx`.

**Helpers de célula:** `dashboardCellText`, `dashboardCellMono`, `dashboardStatusBadge`.

**Referência visual:** `components/dashboard/ClientesList.tsx`, `ImobiliariasList.tsx`.

## MultiSelect do dashboard

Para filtros com `MultiSelect`, usar `dashboardMultiSelectPt()` de `lib/dashboard-multiselect.tsx`. O espaçamento entre checkbox e rótulo nos itens do painel é global em `app/globals.css` (`--aires-multiselect-checkbox-gap`).
