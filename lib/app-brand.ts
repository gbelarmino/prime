/** Identidade visual e textos de marca exibidos na interface. */
export const APP_BRAND_NAME = "DOMUS PARTICIPAÇÕES";

export const APP_BRAND_TAGLINE = "Gestão imobiliária";

export const APP_LOGO_SRC = "/images/logo-domus.png";

export function pageTitle(segment: string): string {
  return `${segment} | ${APP_BRAND_NAME}`;
}
