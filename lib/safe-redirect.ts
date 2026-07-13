const DEFAULT_PORTFOLIO_PATH = "/portafolio";

/**
 * Returns a same-origin destination inside the authenticated portfolio area.
 * Values such as protocol-relative URLs, backslashes and external origins are
 * deliberately rejected because this value is later passed to a redirect API.
 */
export function safePortfolioRedirect(
  value: string | null | undefined,
  fallback = DEFAULT_PORTFOLIO_PATH,
) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.includes(String.fromCharCode(92)) || /[\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }

  try {
    const trustedOrigin = "https://portafolio.local";
    const destination = new URL(value, trustedOrigin);
    const isPortfolioPath =
      destination.pathname === DEFAULT_PORTFOLIO_PATH ||
      destination.pathname.startsWith(`${DEFAULT_PORTFOLIO_PATH}/`);

    if (destination.origin !== trustedOrigin || !isPortfolioPath) {
      return fallback;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}
