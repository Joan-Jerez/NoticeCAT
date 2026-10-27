// Apariencia de cada medio: el color principal, el papel, las tipografías y
// las esquinas se traducen a las mismas variables CSS de tokens.css, así cada
// componente cambia sin tocar su código. El color se corrige solo hasta que el
// texto sobre él y él sobre el papel se lean (contraste AA, 4,5:1).

export type Paper = "crema" | "blanco" | "piedra";
export type FontSet = "revista" | "clasico" | "moderno" | "editorial";
export type Corners = "suaves" | "rectas";

export interface OrgTheme {
  accent: string; // #rrggbb
  paper: Paper;
  fonts: FontSet;
  corners: Corners;
  showName: boolean; // con logo: mostrar también el nombre al lado
}

export const DEFAULT_THEME: OrgTheme = { accent: "#A2441F", paper: "crema", fonts: "revista", corners: "suaves", showName: true };

export const PAPERS: Record<Paper, { label: string; c: Record<string, string> }> = {
  crema: {
    label: "Crema",
    c: { bg: "#FAF6EF", surface: "#F3ECE1", raised: "#FFFDF9", border: "#E7DCCB", "border-input": "#8F7F6C", text: "#2B211A", "text-muted": "#6B5D4F", inverse: "#2B211A", "inverse-surface": "#3B2F26", "inverse-border": "#4A3D32", "on-inverse": "#FAF3EA", "on-inverse-muted": "#C2B3A2", scrim: "#2B211A" },
  },
  blanco: {
    label: "Blanco",
    c: { bg: "#FFFFFF", surface: "#F5F5F4", raised: "#FFFFFF", border: "#E7E5E4", "border-input": "#8A8580", text: "#1C1917", "text-muted": "#57534E", inverse: "#1C1917", "inverse-surface": "#292524", "inverse-border": "#3A3532", "on-inverse": "#FAFAF9", "on-inverse-muted": "#B8B3AE", scrim: "#1C1917" },
  },
  piedra: {
    label: "Piedra",
    c: { bg: "#F2F1EE", surface: "#E8E6E1", raised: "#FBFAF8", border: "#D9D6CF", "border-input": "#7F7A71", text: "#1F2124", "text-muted": "#55585E", inverse: "#1F2124", "inverse-surface": "#2C2F33", "inverse-border": "#3B3F44", "on-inverse": "#F5F5F3", "on-inverse-muted": "#B4B7BC", scrim: "#1F2124" },
  },
};

// Variables que pone app/layout.tsx con next/font; cada juego elige tres.
export const FONT_SETS: Record<FontSet, { label: string; sample: string; display: string; serif: string; sans: string }> = {
  revista: { label: "Revista", sample: "Fraunces y Literata", display: "--f-fraunces", serif: "--f-literata", sans: "--f-dmsans" },
  clasico: { label: "Clásico", sample: "Playfair y Source Serif", display: "--f-playfair", serif: "--f-sourceserif", sans: "--f-inter" },
  moderno: { label: "Moderno", sample: "Space Grotesk e Inter", display: "--f-grotesk", serif: "--f-inter", sans: "--f-inter" },
  editorial: { label: "Editorial", sample: "DM Serif y Merriweather", display: "--f-dmserif", serif: "--f-merriweather", sans: "--f-worksans" },
};

const CORNERS: Record<Corners, Record<string, string>> = {
  suaves: { xs: "4px", sm: "8px", md: "14px", lg: "22px" },
  rectas: { xs: "2px", sm: "3px", md: "4px", lg: "6px" },
};

// ------------------------------------------------------------------ color

const HEX = /^#[0-9a-f]{6}$/i;

function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function toHex(c: number[]) {
  return "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}
function mix(a: string, b: string, t: number) {
  const [p, q] = [rgb(a), rgb(b)];
  return toHex(p.map((v, i) => v + (q[i]! - v) * t));
}
const darker = (hex: string, t: number) => mix(hex, "#000000", t);

// Colores derivados del principal, ya corregidos para contraste AA.
export function accentPalette(input: string, paper: Paper) {
  const p = PAPERS[paper].c;
  const start = HEX.test(input) ? input.toUpperCase() : DEFAULT_THEME.accent;
  let accent = start;
  let tint = mix(p.bg!, accent, 0.14);
  // oscurecer de a poco hasta que se lea sobre el papel y sobre su propio tinte
  for (let i = 0; i < 40 && (contrast(accent, p.bg!) < 4.5 || contrast(accent, tint) < 4.5 || contrast(accent, p.raised!) < 4.5); i++) {
    accent = darker(accent, 0.06);
    tint = mix(p.bg!, accent, 0.14);
  }
  const hover = darker(accent, 0.18);
  const onAccent = contrast("#FFFFFF", accent) >= 4.5 ? "#FFFFFF" : "#111111";
  return { accent, hover, tint, onAccent, adjusted: accent !== start };
}

// ------------------------------------------------------------------ salida

export function normalizeTheme(raw: unknown): OrgTheme {
  const t = (raw && typeof raw === "object" ? raw : {}) as Partial<OrgTheme>;
  return {
    accent: typeof t.accent === "string" && HEX.test(t.accent) ? t.accent : DEFAULT_THEME.accent,
    paper: t.paper && t.paper in PAPERS ? t.paper : DEFAULT_THEME.paper,
    fonts: t.fonts && t.fonts in FONT_SETS ? t.fonts : DEFAULT_THEME.fonts,
    corners: t.corners && t.corners in CORNERS ? t.corners : DEFAULT_THEME.corners,
    showName: typeof t.showName === "boolean" ? t.showName : DEFAULT_THEME.showName,
  };
}

// Variables CSS del tema (objeto: sirve para style={} y para escribir la hoja).
export function themeVars(theme: OrgTheme): Record<string, string> {
  const paper = PAPERS[theme.paper].c;
  const { accent, hover, tint, onAccent } = accentPalette(theme.accent, theme.paper);
  const fonts = FONT_SETS[theme.fonts];
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(paper)) vars[`--color-${k}`] = v;
  Object.assign(vars, {
    "--color-surface-tint": tint,
    "--color-accent": accent,
    "--color-accent-hover": hover,
    "--color-on-accent": onAccent,
    "--color-focus": accent,
    "--font-nf-display": `var(${fonts.display})`,
    "--font-nf-serif": `var(${fonts.serif})`,
    "--font-nf-sans": `var(${fonts.sans})`,
  });
  for (const [k, v] of Object.entries(CORNERS[theme.corners])) vars[`--radius-${k}`] = v;
  return vars;
}

// Hoja para el <head>. Todos los valores salen de listas cerradas o de hex
// validado: no hay texto del usuario que pueda colarse en el CSS.
export function themeCss(theme: OrgTheme) {
  return `:root{${Object.entries(themeVars(theme))
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;
}

// Para la vista previa del panel, que aplica el tema solo a una caja: las
// variables --font-* finales se resuelven en :root, así que se pisan aquí.
export function previewVars(theme: OrgTheme): Record<string, string> {
  const f = FONT_SETS[theme.fonts];
  return {
    ...themeVars(theme),
    "--font-display": `var(${f.display}), Georgia, serif`,
    "--font-serif": `var(${f.serif}), Georgia, serif`,
    "--font-sans": `var(${f.sans}), system-ui, sans-serif`,
  };
}
