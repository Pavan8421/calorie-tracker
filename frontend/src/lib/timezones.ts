/** Legacy / Windows-ICU names that Python ZoneInfo rejects. Keep in sync with backend. */
const TIMEZONE_ALIASES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Europe/Kiev": "Europe/Kyiv",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Truk": "Pacific/Chuuk",
};

export function normalizeTimezone(value: string): string {
  const trimmed = value.trim();
  return TIMEZONE_ALIASES[trimmed] ?? trimmed;
}

export function getBrowserTimezone(): string {
  try {
    const raw = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    return normalizeTimezone(raw);
  } catch {
    return "UTC";
  }
}

type IntlWithTimeZones = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

export function getTimezoneOptions(): string[] {
  const intl = Intl as IntlWithTimeZones;
  try {
    const zones = intl.supportedValuesOf?.("timeZone");
    if (!zones?.length) {
      throw new Error("supportedValuesOf unavailable");
    }
    const canonical = zones.map(normalizeTimezone);
    const unique = [...new Set(canonical)];
    const browser = getBrowserTimezone();
    if (!unique.includes(browser)) {
      return [browser, ...unique];
    }
    return unique;
  } catch {
    return [
      "UTC",
      "America/New_York",
      "America/Los_Angeles",
      "Europe/London",
      "Europe/Paris",
      "Asia/Kolkata",
      "Asia/Tokyo",
      "Australia/Sydney",
    ];
  }
}
