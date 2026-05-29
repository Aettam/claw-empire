const rtfCache = new Map<string, Intl.RelativeTimeFormat>();
const dtfCache = new Map<string, Intl.DateTimeFormat>();
const nfCache = new Map<string, Intl.NumberFormat>();

function cacheKey(locale: string, opts: object): string {
  return `${locale}|${JSON.stringify(opts)}`;
}

export function cachedRelativeTimeFormat(
  locale: string,
  options?: Intl.RelativeTimeFormatOptions,
): Intl.RelativeTimeFormat {
  const k = cacheKey(locale, options ?? {});
  let fmt = rtfCache.get(k);
  if (!fmt) {
    fmt = new Intl.RelativeTimeFormat(locale, options);
    rtfCache.set(k, fmt);
  }
  return fmt;
}

export function cachedDateTimeFormat(
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const k = cacheKey(locale, options ?? {});
  let fmt = dtfCache.get(k);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, options);
    dtfCache.set(k, fmt);
  }
  return fmt;
}

export function cachedNumberFormat(
  locale: string,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const k = cacheKey(locale, options ?? {});
  let fmt = nfCache.get(k);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, options);
    nfCache.set(k, fmt);
  }
  return fmt;
}
