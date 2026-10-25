import type { Organization } from "./types";

// Partes de una fecha en la zona horaria del medio (nunca la del servidor).
export function dateParts(iso: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { yyyy: get("year"), mm: get("month"), dd: get("day") };
}

export function dayKey(iso: string, timezone: string) {
  const { yyyy, mm, dd } = dateParts(iso, timezone);
  return `${yyyy}-${mm}-${dd}`;
}

const MONTHS_SHORT = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];
const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function formatTime(iso: string, org: Pick<Organization, "timezone">) {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: org.timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(new Date(iso))
    .replace(/\s?a\.?\s?m\.?/i, " a. m.")
    .replace(/\s?p\.?\s?m\.?/i, " p. m.");
}

export function formatShortDate(iso: string, org: Pick<Organization, "timezone">) {
  const { yyyy, mm, dd } = dateParts(iso, org.timezone);
  return `${Number(dd)} ${MONTHS_SHORT[Number(mm) - 1]} ${yyyy}`;
}

export function formatLongDate(isoOrKey: string, org: Pick<Organization, "timezone">) {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(isoOrKey) ? `${isoOrKey}T16:00:00Z` : isoOrKey;
  const d = new Date(iso);
  const weekday = new Intl.DateTimeFormat("es-DO", { timeZone: org.timezone, weekday: "long" }).format(d);
  const { yyyy, mm, dd } = dateParts(iso, org.timezone);
  const w = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${w}, ${Number(dd)} de ${MONTHS_LONG[Number(mm) - 1]} de ${yyyy}`;
}

export function monthName(mm: number) {
  return MONTHS_LONG[mm - 1];
}

// "hace 12 min" durante la primera hora; después, fecha corta.
export function relativeOrDate(iso: string, org: Pick<Organization, "timezone">, now = Date.now()) {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins >= 0 && mins < 1) return "ahora";
  if (mins >= 1 && mins < 60) return `hace ${mins} min`;
  return null;
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function readingMinutes(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

// "2026-10-25T15:00" (hora local del medio) -> ISO en UTC.
export function zonedLocalToUtc(local: string, timezone: string) {
  const asUtc = new Date(`${local}:00Z`);
  if (Number.isNaN(asUtc.getTime())) return null;
  // diferencia entre la hora del medio y UTC en ese instante (cubre horario de verano)
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(asUtc);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const shown = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(asUtc.getTime() - (shown - asUtc.getTime())).toISOString();
}

// ISO -> "2026-10-25T15:00" en la hora del medio, para <input type="datetime-local">.
export function utcToZonedLocal(iso: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
