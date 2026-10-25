// Tipos y utilidades comunes a las dos capas de datos (fake.ts y supabase.ts).
import { dateParts } from "../format";
import type { Article, Author, Image, Organization, RichNode, Section } from "../types";

export type SectionNode = Section & { children: Section[] };
export type AuthorView = Author & { photo: Image | null };

export interface ArticleFilter {
  sectionId?: string; // incluye sus subsecciones
  authorId?: string;
  tagId?: string; // tema o lugar
  day?: string; // "2026-10-25" en la zona del medio
  featured?: boolean;
  excludeIds?: string[];
}

export interface ArticleInput {
  title: string;
  dek: string | null;
  body: RichNode;
  sectionId: string;
  authorId: string | null;
  placeTagId: string | null;
  coverImageId: string | null;
  tagIds: string[];
  isFeatured: boolean;
  isSponsored: boolean;
}

export class ConflictError extends Error {}
export class ForbiddenError extends Error {}

export function articlePath(a: Pick<Article, "slug" | "number" | "publishedAt" | "updatedAt">, section: Section, parent: Section | null, org: Organization) {
  const { yyyy, mm, dd } = dateParts(a.publishedAt ?? a.updatedAt, org.timezone);
  const sec = parent ? `${parent.slug}/${section.slug}` : section.slug;
  return `/${sec}/${yyyy}/${mm}/${dd}/${a.slug}/${a.number}`;
}

// Cursor opaco "fecha de publicación | número": estable aunque entren notas nuevas.
export function encodeCursor(a: Pick<Article, "publishedAt" | "number">) {
  return Buffer.from(`${a.publishedAt}|${a.number}`).toString("base64url");
}

export function decodeCursor(cursor: string | null | undefined): { publishedAt: string; number: number } | null {
  if (!cursor) return null;
  const [publishedAt, number] = Buffer.from(cursor, "base64url").toString().split("|");
  if (!publishedAt || !Number.isFinite(Number(number)) || Number.isNaN(Date.parse(publishedAt))) return null;
  return { publishedAt, number: Number(number) };
}
