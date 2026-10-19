import { headers } from "next/headers";
import type { ChatGPTUser } from "./user";

export async function getAuthenticatedUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  if (!userId || !email) return null;
  let fullName: string | null = null;
  if (requestHeaders.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
    try {
      const encoded = requestHeaders.get("oai-authenticated-user-full-name");
      if (encoded) fullName = decodeURIComponent(encoded);
    } catch { /* Keep the original email fallback for malformed names. */ }
  }
  return { userId, displayName: fullName ?? email, email, fullName };
}

export const signInPath = (returnTo: string) => `/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`;
export const signOutPath = (returnTo: string) => `/signout-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`;
export function authHandler() {
  return new Response("Not found", { status: 404 });
}
