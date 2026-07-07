/**
 * Hunter.io Domain Search — returns people at a target company plus their
 * emails. Used by /api/contacts/find to pick a real recipient for the cold
 * outreach step.
 *
 * Free tier is 25 searches / month. This client requests a page of up to
 * 25 people per call and does client-side filtering/ranking so we don't
 * burn multiple searches on the same company.
 */

const HUNTER_API = "https://api.hunter.io/v2";

export type HunterContact = {
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  position: string;
  seniority: string;
  department: string;
  confidence: number;
  linkedin?: string;
  twitter?: string;
};

type RawEmail = {
  value: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  seniority: string | null;
  department: string | null;
  confidence: number | null;
  linkedin?: string | null;
  twitter?: string | null;
};

/**
 * Try to figure out the target department from the JD's role text. Rough
 * heuristics — Hunter's department taxonomy is: executive, finance, hr, it,
 * legal, marketing, operations, sales, support, engineering, management,
 * design, communication, education, health.
 */
function inferDepartments(roleText: string | undefined): string[] {
  if (!roleText) return [];
  const s = roleText.toLowerCase();
  if (s.includes("product manager") || s.includes("pm") || /\bproduct\b/.test(s)) return ["management", "engineering"];
  if (s.includes("engineer") || s.includes("developer") || s.includes("swe")) return ["engineering", "it"];
  if (s.includes("designer") || s.includes("design")) return ["design"];
  if (s.includes("marketing") || s.includes("growth")) return ["marketing"];
  if (s.includes("sales") || s.includes("account executive") || s.includes("bd")) return ["sales"];
  if (s.includes("finance") || s.includes("accounting") || s.includes("cfo")) return ["finance"];
  if (s.includes("legal") || s.includes("counsel")) return ["legal"];
  if (s.includes("people") || s.includes("recruiter") || s.includes("hr")) return ["hr"];
  if (s.includes("operations") || s.includes("ops")) return ["operations"];
  if (s.includes("founder") || s.includes("ceo") || s.includes("cto") || s.includes("coo")) return ["executive"];
  return [];
}

const SENIORITY_RANK: Record<string, number> = {
  executive: 4,
  senior: 3,
  junior: 1,
};

function rankContact(c: HunterContact, targetDepartments: string[]): number {
  let score = c.confidence;
  if (targetDepartments.includes(c.department)) score += 25;
  score += (SENIORITY_RANK[c.seniority] ?? 2) * 5;
  // Slight bias toward people with a LinkedIn — makes the value-first
  // "read your recent posts" angle more actionable.
  if (c.linkedin) score += 3;
  return score;
}

export type FindContactsInput = {
  company: string;
  role?: string;
  limit?: number;
};

export type FindContactsResult = {
  organization: string | null;
  domain: string | null;
  contacts: HunterContact[];
  totalReturned: number;
  totalAtCompany: number;
};

export async function findContactsByCompany(
  input: FindContactsInput,
): Promise<FindContactsResult> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    throw new Error("HUNTER_API_KEY is not configured on the server.");
  }
  const limit = Math.min(input.limit ?? 5, 25);

  const url = new URL(`${HUNTER_API}/domain-search`);
  url.searchParams.set("company", input.company);
  url.searchParams.set("limit", "25");
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), { method: "GET" });
  const body = (await res.json()) as {
    data?: {
      domain?: string | null;
      organization?: string | null;
      emails?: RawEmail[];
      meta?: { results?: number };
    };
    errors?: Array<{ id?: string; code?: number; details?: string }>;
  };

  if (!res.ok) {
    const detail = body.errors?.[0]?.details || `Hunter returned HTTP ${res.status}`;
    throw new Error(detail);
  }

  const emails = body.data?.emails ?? [];
  const normalized: HunterContact[] = emails
    .filter((e) => e.value && (e.first_name || e.last_name))
    .map((e) => ({
      email: e.value,
      firstName: e.first_name ?? "",
      lastName: e.last_name ?? "",
      fullName: [e.first_name, e.last_name].filter(Boolean).join(" ").trim(),
      position: e.position ?? "",
      seniority: (e.seniority ?? "").toLowerCase(),
      department: (e.department ?? "").toLowerCase(),
      confidence: e.confidence ?? 0,
      linkedin: e.linkedin ?? undefined,
      twitter: e.twitter ?? undefined,
    }));

  const targetDepartments = inferDepartments(input.role);
  const sorted = normalized
    .filter((c) => c.seniority !== "junior")
    .sort((a, b) => rankContact(b, targetDepartments) - rankContact(a, targetDepartments));

  return {
    organization: body.data?.organization ?? null,
    domain: body.data?.domain ?? null,
    contacts: sorted.slice(0, limit),
    totalReturned: emails.length,
    totalAtCompany: body.data?.meta?.results ?? emails.length,
  };
}
