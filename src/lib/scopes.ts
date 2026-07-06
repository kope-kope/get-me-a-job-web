export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
] as const;

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.modify"] as const;

export function scopeStatus(granted: string[] | undefined) {
  const g = new Set(granted ?? []);
  return {
    drive: DRIVE_SCOPES.every((s) => g.has(s)),
    gmail: GMAIL_SCOPES.every((s) => g.has(s)),
  };
}
