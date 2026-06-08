const STORAGE_KEY = "ntughari_feedback_client_token";

export function getFeedbackClientToken(): string {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const token = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, token);
  return token;
}
