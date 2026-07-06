import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import mammoth from "mammoth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith(".docx")) {
      const { value } = await mammoth.extractRawText({ buffer: bytes });
      return NextResponse.json({ markdown: value.trim() });
    }
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      return NextResponse.json({ markdown: bytes.toString("utf-8").trim() });
    }
    if (name.endsWith(".pdf")) {
      return NextResponse.json(
        {
          error:
            "PDF parsing isn't wired up yet — paste the text or export to .docx and try again.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: `Unsupported file type: ${name}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "parse failed" },
      { status: 500 },
    );
  }
}
