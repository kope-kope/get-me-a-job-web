import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasGrantedScopes } from "@/auth";
import { DRIVE_SCOPES } from "@/lib/scopes";
import { ensureJobSearchFolder, createTextDoc } from "@/lib/google";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { markdown } = (await req.json()) as { markdown?: string };
  if (!markdown?.trim()) {
    return NextResponse.json({ error: "empty resume" }, { status: 400 });
  }

  if (!hasGrantedScopes(session, DRIVE_SCOPES) || !session.accessToken) {
    return NextResponse.json(
      { error: "Google Drive not connected. Go back to onboarding and click Connect." },
      { status: 403 },
    );
  }

  try {
    const folder = await ensureJobSearchFolder(session.accessToken);
    const doc = await createTextDoc(
      session.accessToken,
      "Master Resume",
      markdown,
      folder.id,
    );
    return NextResponse.json({
      folderId: folder.id,
      folderUrl: folder.url,
      docId: doc.id,
      docUrl: doc.url,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "save failed" },
      { status: 500 },
    );
  }
}
