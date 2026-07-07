import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { findContactsByCompany } from "@/lib/hunter";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized", code: "SIGN_IN" }, { status: 401 });
  }

  const { company, role, limit } = (await req.json()) as {
    company?: string;
    role?: string;
    limit?: number;
  };
  if (!company?.trim()) {
    return NextResponse.json({ error: "missing company" }, { status: 400 });
  }

  if (!process.env.HUNTER_API_KEY) {
    return NextResponse.json(
      { error: "Hunter.io isn't configured. Skip this step or add a HUNTER_API_KEY env var.", code: "HUNTER_MISSING" },
      { status: 503 },
    );
  }

  try {
    const result = await findContactsByCompany({ company, role, limit });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "contact search failed";
    const code = (err as Error & { code?: string }).code;
    if (code === "HUNTER_QUOTA") {
      return NextResponse.json({ error: message, code }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
