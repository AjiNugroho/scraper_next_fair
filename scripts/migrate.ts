import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import path from "path"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)

const migrationsFolder = path.join(import.meta.dirname, "../db/migrations")

console.log("[migrate] running migrations from", migrationsFolder)
await migrate(db, { migrationsFolder })
await pool.end()
console.log("[migrate] done")
