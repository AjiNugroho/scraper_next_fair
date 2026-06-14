import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins"
import { apiKey } from "@better-auth/api-key"
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/drizzle"; // your drizzle instance
import { schema } from "@/db/auth-schema"; // your drizzle schema
import { openAPI } from "better-auth/plugins"

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    baseURL:process.env.BETTER_AUTH_URL!,
    trustedOrigins: [process.env.TRUSTED_ORIGINS!],
    emailAndPassword:{
        enabled: true,
    },
    plugins:[
        admin(),
        apiKey({
            rateLimit:{
                enabled: true,
                maxRequests:100,
                timeWindow: 1000 * 60
            }
        }),
        openAPI(), 
    ]

});