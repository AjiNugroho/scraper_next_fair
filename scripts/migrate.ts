import { Pool } from "pg"
import { readFile, readdir } from "fs/promises"
import path from "path"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Separate tracking table — avoids conflict with drizzle-kit's __drizzle_migrations
await pool.query(`
  CREATE TABLE IF NOT EXISTS "_deploy_migrations" (
    tag text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`)

const { rows } = await pool.query<{ tag: string }>("SELECT tag FROM _deploy_migrations")
const applied = new Set(rows.map((r) => r.tag))

const migrationsDir = path.join(import.meta.dirname, "../db/migrations")
const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith(".sql"))
  .sort()

let count = 0
for (const file of files) {
  const tag = file.replace(".sql", "")
  if (applied.has(tag)) {
    console.log(`[migrate] skip ${tag}`)
    continue
  }

  const sql = await readFile(path.join(migrationsDir, file), "utf-8")
  await pool.query(sql)
  await pool.query("INSERT INTO _deploy_migrations (tag) VALUES ($1)", [tag])
  console.log(`[migrate] applied ${tag}`)
  count++
}

await pool.end()
console.log(`[migrate] done — ${count} migration(s) applied`)
