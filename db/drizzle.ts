import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema as authSchema } from "./auth-schema";
import { instagramTaggedRequest } from "./scraper-schema";

const schema = { ...authSchema, instagramTaggedRequest };

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,           
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

export const db = drizzle(pool,{schema});