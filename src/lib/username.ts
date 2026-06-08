const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function validateUsername(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "Username is required";
  if (trimmed.length < 3) return "Username must be at least 3 characters";
  if (trimmed.length > 24) return "Username must be at most 24 characters";
  if (!USERNAME_REGEX.test(trimmed)) {
    return "Use only letters, numbers, and underscores";
  }
  return null;
}

export function displayUsername(username: string | null | undefined, email?: string | null): string {
  if (username) return username;
  if (email) return email.split("@")[0] ?? "Learner";
  return "Learner";
}
