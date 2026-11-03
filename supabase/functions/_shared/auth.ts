/**
 * Resolve the signed-in user from the request's bearer token.
 * Returns null for the anon/publishable key, anonymous users, or invalid tokens,
 * so paid functions (LLM, ASR) can't be called by anyone holding the public key.
 */
export async function getSignedInUserId(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const apiKey = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!token || !apiKey || !supabaseUrl || token === apiKey) return null;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: apiKey },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string; is_anonymous?: boolean };
    return user.id && !user.is_anonymous ? user.id : null;
  } catch (e) {
    console.error("Auth check failed:", e);
    return null;
  }
}
