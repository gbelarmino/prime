/** Rotas do portal sem sessão COMPRADOR (landing, cadastro, login). */
export const PORTAL_PUBLIC_PATHS = ["/portal", "/portal/entrar", "/portal/cadastrar"] as const;

export function isPortalPublicPath(pathname: string): boolean {
  return (PORTAL_PUBLIC_PATHS as readonly string[]).includes(pathname);
}

export function isPortalProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/portal/") && !isPortalPublicPath(pathname);
}
