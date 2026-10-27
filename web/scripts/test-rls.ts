// Prueba las reglas de acceso (RLS) directamente contra Supabase, sin pasar por la app:
// si la app olvidara un filtro, esto es lo que vería cada usuario.
//   npm run db:test-rls   (después de npm run db:seed)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const password = process.env.SEED_PASSWORD || "NoticeCAT-dev-2026";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "ok  " : "FALLA"} ${name}${!ok && detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
}

async function as(email: string | null): Promise<SupabaseClient> {
  const c = createClient(url, anonKey, opts);
  if (email) {
    const { error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`no se pudo entrar como ${email}: ${error.message}`);
  }
  return c;
}

async function orgId(c: SupabaseClient, slug: string) {
  const { data } = await c.from("organizations").select("id").eq("slug", slug).single();
  return data!.id as string;
}

async function main() {
  const anon = await as(null);
  const editora = await as("editora@gaceta.test");
  const redactor = await as("redactor@gaceta.test");
  const costa = await as("admin@costa.test");
  const gacetaId = await orgId(anon, "gaceta");
  const costaId = await orgId(anon, "costa");
  const { data: sec } = await anon.from("sections").select("id").eq("org_id", gacetaId).limit(1).single();
  const { data: costaSec } = await anon.from("sections").select("id").eq("org_id", costaId).limit(1).single();

  // público
  const { data: anonDrafts } = await anon.from("articles").select("id").in("status", ["draft", "archived"]);
  check("anónimo no ve borradores", anonDrafts?.length === 0, `${anonDrafts?.length}`);
  const { data: anonFuture } = await anon.from("articles").select("id").gt("published_at", new Date().toISOString());
  check("anónimo no ve programadas antes de su hora", anonFuture?.length === 0);
  const { data: anonMembers } = await anon.from("memberships").select("id");
  check("anónimo no ve el equipo", anonMembers?.length === 0);
  const { data: anonVotes } = await anon.from("poll_votes").select("id");
  check("anónimo no ve votos individuales", anonVotes?.length === 0);
  const { data: results } = await anon.from("poll_results").select("votes");
  check("anónimo ve los conteos de la encuesta", (results?.length ?? 0) > 0);
  const { error: anonInsert } = await anon.from("articles").insert({ org_id: gacetaId, slug: "x", title: "x", section_id: sec!.id });
  check("anónimo no puede crear notas", !!anonInsert);

  // aislamiento entre medios
  const { data: editoraDrafts } = await editora.from("articles").select("org_id").eq("status", "draft");
  check("la editora ve borradores de su medio", (editoraDrafts?.length ?? 0) > 0);
  const { data: costaDraftsSeenByGaceta } = await editora.from("articles").select("id").eq("org_id", costaId).eq("status", "draft");
  check("la editora no ve borradores del otro medio", costaDraftsSeenByGaceta?.length === 0);
  const { error: crossInsert } = await editora.from("articles").insert({ org_id: costaId, slug: "intrusa", title: "Intrusa", section_id: costaSec!.id });
  check("la editora no puede publicar en el otro medio", !!crossInsert);
  const { data: crossUpdate } = await costa.from("articles").update({ title: "pisada" }).eq("org_id", gacetaId).select("id");
  check("el admin de Costa no puede editar notas de La Gaceta", crossUpdate?.length === 0);
  const { data: costaMembers } = await costa.from("memberships").select("org_id");
  check("el admin de Costa solo ve su equipo", !!costaMembers?.length && costaMembers.every((m) => m.org_id === costaId));
  const { error: selfPromote } = await editora.from("memberships").update({ role: "owner" }).eq("org_id", gacetaId).select("id").then((r) => ({ error: r.error ?? (r.data?.length ? null : { message: "0 filas" }) }));
  check("la editora no puede subirse de rol", !!selfPromote);

  // redactor: escribe sus borradores, no publica
  const { data: own, error: ownErr } = await redactor
    .from("articles")
    .insert({ org_id: gacetaId, slug: "borrador-redactor", title: "Borrador del redactor", section_id: sec!.id, status: "draft", created_by: (await redactor.auth.getUser()).data.user!.id })
    .select("id")
    .single();
  check("el redactor crea su borrador", !ownErr && !!own, ownErr?.message);
  if (own) {
    const { data: pub } = await redactor.from("articles").update({ status: "published", published_at: new Date().toISOString() }).eq("id", own.id).select("id");
    check("el redactor no puede publicar", !pub?.length);
    await editora.from("articles").delete().eq("id", own.id);
  }
  const { data: othersDraft } = await redactor.from("articles").select("id").eq("status", "draft").neq("created_by", (await redactor.auth.getUser()).data.user!.id);
  check("el redactor no ve borradores ajenos", othersDraft?.length === 0);

  // facturación y eventos de Stripe: nadie desde el navegador
  const { data: billing } = await costa.from("org_billing").select("org_id").eq("org_id", gacetaId);
  check("nadie ve la facturación de otro medio", billing?.length === 0);
  const { error: rpc } = await anon.rpc("hit_rate_limit", { p_key: "x", p_max: 1, p_window_seconds: 60 });
  check("el contador de límites no se puede llamar desde el navegador", !!rpc);

  console.log(failed ? `\n${failed} pruebas fallaron` : "\nTodas las reglas de acceso se cumplen.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
