import "server-only";
import * as fake from "./fake";
import * as supa from "./supabase";
import { supabaseEnabled } from "../supabase/server";

// Con las claves de Supabase en .env.local, la base real; sin ellas, el JSON
// local. Las pantallas no saben cuál se usa: las firmas son las mismas
// (TypeScript lo comprueba en la asignación de abajo).
const impl: typeof fake = supabaseEnabled ? supa : fake;

export const usingSupabase = supabaseEnabled;

export const {
  getOrgByHost,
  getOrgBySlug,
  getDefaultOrg,
  listSections,
  getSectionTree,
  resolveSection,
  listArticles,
  getArticleByNumber,
  getVisibleArticleById,
  getArticleViewForStaff,
  countArticlesByDay,
  searchArticles,
  getAuthorBySlug,
  listAuthors,
  getTagBySlug,
  listTags,
  getActivePoll,
  votePoll,
  listImages,
  getStaffUser,
  listAdminArticles,
  getAdminStats,
  getArticleForEdit,
  saveArticle,
  publishArticle,
  unpublishArticle,
  deleteArticle,
} = impl;

export { articlePath, ConflictError, ForbiddenError, type ArticleFilter, type ArticleInput, type AuthorView, type SectionNode } from "./shared";
