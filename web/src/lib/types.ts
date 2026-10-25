// Tipos de dominio. Reflejan replica/schema.sql (camelCase en vez de snake_case).

export type Role = "owner" | "admin" | "editor" | "writer";
export type ArticleStatus = "draft" | "scheduled" | "published" | "archived";
export type TagKind = "topic" | "place";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  timezone: string;
  locale: string;
  hosts: string[];
  social: { instagram?: string; facebook?: string; x?: string };
}

export interface Section {
  id: string;
  orgId: string;
  parentId: string | null;
  name: string;
  slug: string;
  position: number;
  inMenu: boolean;
  rssEnabled: boolean;
}

export interface Image {
  id: string;
  orgId: string;
  src: string;
  alt: string;
  caption: string | null;
  credit: string | null;
  width: number;
  height: number;
}

export interface Author {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  bio: string | null;
  photoImageId: string | null;
  isColumnist: boolean;
  columnName: string | null;
}

export interface Tag {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  kind: TagKind;
}

// Documento de texto rico con la forma de Tiptap/ProseMirror.
export type RichMark = { type: "bold" | "italic" } | { type: "link"; attrs: { href: string } };
export type RichNode =
  | { type: "doc"; content: RichNode[] }
  | { type: "paragraph"; content?: RichNode[] }
  | { type: "heading"; attrs: { level: 2 | 3 }; content?: RichNode[] }
  | { type: "bulletList"; content: RichNode[] }
  | { type: "listItem"; content: RichNode[] }
  | { type: "blockquote"; content: RichNode[] }
  | { type: "relatedArticle"; attrs: { articleId: string } }
  | { type: "text"; text: string; marks?: RichMark[] };

export interface Article {
  id: string;
  orgId: string;
  number: number;
  slug: string;
  title: string;
  dek: string | null;
  body: RichNode;
  bodyText: string;
  readingMinutes: number;
  sectionId: string;
  authorId: string | null;
  placeTagId: string | null;
  coverImageId: string | null;
  tagIds: string[];
  status: ArticleStatus;
  publishedAt: string | null;
  isSponsored: boolean;
  isFeatured: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  memberships: { orgId: string; role: Role }[];
}

export interface Poll {
  id: string;
  orgId: string;
  question: string;
  options: { id: string; label: string; votes: number }[];
  startsAt: string;
  endsAt: string | null;
}

// Una nota lista para pintar: con sus relaciones resueltas.
export interface ArticleView extends Article {
  section: Section;
  parentSection: Section | null;
  author: (Author & { photo: Image | null }) | null;
  place: Tag | null;
  cover: Image | null;
  tags: Tag[];
  url: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
