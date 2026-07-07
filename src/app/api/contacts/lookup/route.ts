import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { findEmailByName } from "@/lib/hunter";

export const runtime = "nodejs";
export const maxDuration = 60;

type Target = {
  firstName: string;
  lastName: string;
  company?: string;
  domain?: string;
  position?: string;
  linkedinUrl?: string;
  reasoning?: string;
};

type LookupHit = Target & {
  found: boolean;
  email?: string;
  score?: number;
  verificationStatus?: string;
  error?: string;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized", code: "SIGN_IN" }, { status: 401 });
  }

  if (!process.env.HUNTER_API_KEY) {
    return NextResponse.json(
      { error: "Hunter.io isn't configured on the server.", code: "HUNTER_MISSING" },
      { status: 503 },
    );
  }

  const { targets } = (await req.json()) as { targets?: Target[] };
  if (!Array.isArray(targets) || targets.length === 0) {
    return NextResponse.json({ error: "missing targets" }, { status: 400 });
  }

  const results: LookupHit[] = [];
  let quotaHit = false;

  for (const t of targets) {
    if (quotaHit) {
      results.push({ ...t, found: false, error: "Hunter quota exhausted before this lookup ran." });
      continue;
    }
    try {
      const hit = await findEmailByName({
        firstName: t.firstName,
        lastName: t.lastName,
        company: t.company,
        domain: t.domain,
      });
      if (hit) {
        results.push({
          ...t,
          found: true,
          email: hit.email,
          score: hit.score,
          verificationStatus: hit.verificationStatus,
          // Prefer Hunter's title if we didn't get one from research.
          position: t.position || hit.position,
          linkedinUrl: t.linkedinUrl ?? hit.linkedin,
        });
      } else {
        results.push({
          ...t,
          found: false,
          error: "Hunter couldn't find an email for this person.",
        });
      }
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === "HUNTER_QUOTA") {
        quotaHit = true;
        results.push({
          ...t,
          found: false,
          error: err instanceof Error ? err.message : "Hunter quota exhausted.",
        });
      } else {
        results.push({
          ...t,
          found: false,
          error: err instanceof Error ? err.message : "lookup failed",
        });
      }
    }
  }

  return NextResponse.json({
    results,
    quotaHit,
    foundCount: results.filter((r) => r.found).length,
  });
}
