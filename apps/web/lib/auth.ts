// apps/web/lib/auth.ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  // nextCookies must be the last plugin — it's what lets Server Actions
  // and Server Components set the session cookie correctly in App Router.
  plugins: [nextCookies()],
});