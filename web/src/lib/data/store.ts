import "server-only";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { buildSeed, DB_VERSION, type DB } from "./seed";

// Almacén falso: un JSON en web/.data/db.json. Lo reemplaza Supabase en
// /replica-backend; nada fuera de lib/data sabe que existe.
const DIR = join(process.cwd(), ".data");
const FILE = join(DIR, "db.json");

let cache: { mtimeMs: number; db: DB } | null = null;

export function readDB(): DB {
  if (!existsSync(FILE)) {
    writeDB(buildSeed());
  }
  const { mtimeMs } = statSync(FILE);
  if (cache && cache.mtimeMs === mtimeMs) return cache.db;
  let db = JSON.parse(readFileSync(FILE, "utf8")) as DB;
  if (db.version !== DB_VERSION) {
    db = buildSeed();
    writeDB(db);
  }
  cache = { mtimeMs: statSync(FILE).mtimeMs, db };
  return db;
}

export function writeDB(db: DB) {
  mkdirSync(DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, FILE);
  cache = null;
}

export function resetDB() {
  writeDB(buildSeed());
}
