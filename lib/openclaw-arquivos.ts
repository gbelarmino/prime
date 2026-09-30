const MARKER = /\[\[arquivo:([A-Za-z0-9][A-Za-z0-9._-]{0,80})\]\]/g;
const EXTENSOES = new Set(["xlsx", "csv", "pdf", "png", "jpg", "jpeg"]);

export function isOpenClawArquivoNome(nome: string): boolean {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(nome) || nome.includes("..")) return false;
  const dot = nome.lastIndexOf(".");
  if (dot <= 0 || dot === nome.length - 1) return false;
  return EXTENSOES.has(nome.slice(dot + 1).toLowerCase());
}

/** Tira as marcas `[[arquivo:nome.ext]]` do texto e devolve os nomes por ordem. */
export function splitOpenClawArquivos(content: string): { text: string; files: string[] } {
  const files: string[] = [];
  const text = content
    .replace(MARKER, (_full, nome: string) => {
      if (isOpenClawArquivoNome(nome) && !files.includes(nome)) files.push(nome);
      return "";
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, files };
}
