import NextAuth, { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextRequest } from "next/server";
import { assertVercelConfiguration, canSignIn, ownerEmail } from "../vercel-config";
import type { ChatGPTUser } from "./user";
import { browserPreview } from "../app-mode";

function options(): NextAuthOptions {
  assertVercelConfiguration(process.env);
  return {
    secret: process.env.NEXTAUTH_SECRET,
    providers: [GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })],
    session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
    callbacks: {
      async signIn({ account, profile }) {
        return account?.provider === "google" && canSignIn(profile, process.env);
      },
      async jwt({ token, account, profile }) {
        if (account?.provider === "google" && canSignIn(profile, process.env)) {
          token.dreamlistOwner = `google:${account.providerAccountId}`;
        }
        return token;
      },
      async session({ session, token }) {
        // Check the allowlist on every request, including sessions issued before a change.
        if (session.user?.email?.toLowerCase() === ownerEmail(process.env) &&
            typeof token.dreamlistOwner === "string" && token.dreamlistOwner.startsWith("google:")) {
          Object.assign(session.user, { ownerId: token.dreamlistOwner });
        }
        return session;
      },
    },
  };
}

export async function getAuthenticatedUser(): Promise<ChatGPTUser | null> {
  if (browserPreview) return null;
  const session = await getServerSession(options());
  const user = session?.user as { ownerId?: string; email?: string; name?: string } | undefined;
  if (!user?.ownerId || !user.email) return null;
  return { userId: user.ownerId, email: user.email, displayName: user.name ?? user.email, fullName: user.name ?? null };
}

export const signInPath = (returnTo: string) => `/api/auth/signin?callbackUrl=${encodeURIComponent(returnTo)}`;
export const signOutPath = (returnTo: string) => `/api/auth/signout?callbackUrl=${encodeURIComponent(returnTo)}`;

export async function authHandler(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  if (browserPreview) return new Response("Not found", { status: 404 });
  return NextAuth(options())(request, context);
}
