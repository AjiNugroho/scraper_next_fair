import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { user, account } from "./auth-schema";

const EMAIL = process.env.SUPERADMIN_EMAIL ?? process.env.SUPERADMIN_NAME!;
const PASSWORD = process.env.SUPERADMIN_PASSWORD!;
const DISPLAY_NAME = process.env.SUPERADMIN_DISPLAY_NAME ?? "Super Admin";

if (!EMAIL || !PASSWORD) {
    console.error("Missing SUPERADMIN_EMAIL (or SUPERADMIN_NAME) and SUPERADMIN_PASSWORD in .env");
    process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function seed() {
    console.log(`Seeding super admin: ${EMAIL}`);

    const existing = await db
        .select({ id: user.id, role: user.role })
        .from(user)
        .where(eq(user.email, EMAIL))
        .limit(1);

    if (existing.length > 0) {
        if (existing[0].role !== "admin") {
            await db.update(user).set({ role: "admin" }).where(eq(user.email, EMAIL));
            console.log("Existing user role updated to admin.");
        } else {
            console.log("super admin already exists, skipping creation.");
        }
        await pool.end();
        return;
    }

    const userId = randomUUID();
    const hashed = await hashPassword(PASSWORD);
    const now = new Date();

    await db.insert(user).values({
        id: userId,
        name: DISPLAY_NAME,
        email: EMAIL,
        emailVerified: true,
        role: "admin",
        createdAt: now,
        updatedAt: now,
    });

    await db.insert(account).values({
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: hashed,
        createdAt: now,
        updatedAt: now,
    });

    console.log("Admin created.");
    console.log(`  Email : ${EMAIL}`);
    console.log(`  Name  : ${DISPLAY_NAME}`);
    await pool.end();
}

seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
