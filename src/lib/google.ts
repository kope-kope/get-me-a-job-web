import { google, drive_v3, docs_v1, gmail_v1 } from "googleapis";

function authClient(accessToken: string) {
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  return oauth2;
}

export function driveClient(accessToken: string): drive_v3.Drive {
  return google.drive({ version: "v3", auth: authClient(accessToken) });
}

export function docsClient(accessToken: string): docs_v1.Docs {
  return google.docs({ version: "v1", auth: authClient(accessToken) });
}

export function gmailClient(accessToken: string): gmail_v1.Gmail {
  return google.gmail({ version: "v1", auth: authClient(accessToken) });
}

const JOB_SEARCH_FOLDER_NAME = "Job Search";
const MASTER_RESUME_NAME = "Master Resume";
const STORIES_NAME = "Stories";

export function extractDocId(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/document\/d\/([A-Za-z0-9_-]{20,})/);
  if (urlMatch) return urlMatch[1];
  if (/^[A-Za-z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export async function ensureJobSearchFolder(accessToken: string): Promise<{ id: string; url: string }> {
  const drive = driveClient(accessToken);
  const list = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${JOB_SEARCH_FOLDER_NAME}' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 1,
  });
  const existing = list.data.files?.[0];
  if (existing?.id) {
    return { id: existing.id, url: `https://drive.google.com/drive/folders/${existing.id}` };
  }
  const created = await drive.files.create({
    requestBody: {
      name: JOB_SEARCH_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });
  const id = created.data.id!;
  return { id, url: `https://drive.google.com/drive/folders/${id}` };
}

/**
 * Create a subfolder inside a parent Drive folder.
 */
export async function createSubfolder(
  accessToken: string,
  name: string,
  parentId: string,
): Promise<{ id: string; url: string }> {
  const drive = driveClient(accessToken);
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });
  const id = created.data.id!;
  return { id, url: `https://drive.google.com/drive/folders/${id}` };
}

/**
 * Copy a Google Doc into a target folder with a new title. Preserves the
 * source's full formatting (fonts, bold/italic, spacing, everything).
 */
export async function copyDoc(
  accessToken: string,
  sourceDocId: string,
  title: string,
  parentFolderId?: string,
): Promise<{ id: string; url: string }> {
  const drive = driveClient(accessToken);
  const copied = await drive.files.copy({
    fileId: sourceDocId,
    requestBody: {
      name: title,
      parents: parentFolderId ? [parentFolderId] : undefined,
    },
    fields: "id",
  });
  const id = copied.data.id!;
  return { id, url: `https://docs.google.com/document/d/${id}/edit` };
}

/**
 * Read a Google Doc as plain text — every paragraph joined with newlines.
 * Used to give Claude context about which bullets exist verbatim, so its
 * old_bullet output matches the doc exactly for replaceAllText.
 */
export async function readDocPlaintext(accessToken: string, docId: string): Promise<string> {
  const docs = docsClient(accessToken);
  const { data } = await docs.documents.get({ documentId: docId });
  const parts: string[] = [];
  for (const block of data.body?.content ?? []) {
    const para = block.paragraph;
    if (!para) continue;
    const line = (para.elements ?? [])
      .map((el) => el.textRun?.content ?? "")
      .join("")
      .replace(/\n$/, "");
    parts.push(line);
  }
  return parts.join("\n");
}

/**
 * Apply a batch of exact-text replacements to a Google Doc. Each pair
 * replaces one occurrence at a time (matchCase true) so unrelated
 * repetitions of common words aren't affected.
 */
export async function replaceAllText(
  accessToken: string,
  docId: string,
  pairs: Array<{ oldText: string; newText: string }>,
): Promise<{ occurrencesChanged: number }> {
  const docs = docsClient(accessToken);
  if (pairs.length === 0) return { occurrencesChanged: 0 };
  const res = await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: pairs.map((p) => ({
        replaceAllText: {
          containsText: { text: p.oldText, matchCase: true },
          replaceText: p.newText,
        },
      })),
    },
  });
  let total = 0;
  for (const reply of res.data.replies ?? []) {
    total += reply.replaceAllText?.occurrencesChanged ?? 0;
  }
  return { occurrencesChanged: total };
}

/**
 * Find a file by exact name inside a parent folder. Used to look up
 * "Master Resume" inside "Job Search" without needing a database.
 */
export async function findFileByName(
  accessToken: string,
  name: string,
  parentFolderId: string,
): Promise<{ id: string; url: string } | null> {
  const drive = driveClient(accessToken);
  const escaped = name.replace(/'/g, "\\'");
  const list = await drive.files.list({
    q: `name='${escaped}' and '${parentFolderId}' in parents and trashed=false`,
    fields: "files(id, name, mimeType)",
    pageSize: 1,
  });
  const file = list.data.files?.[0];
  if (!file?.id) return null;
  return { id: file.id, url: `https://docs.google.com/document/d/${file.id}/edit` };
}

/**
 * Register a user's master resume from a Google Doc URL. Copies the source
 * doc into the Job Search folder as "Master Resume" so future tailors have
 * a stable, well-known source to copy from.
 */
export async function registerMasterResume(
  accessToken: string,
  sourceDocUrlOrId: string,
): Promise<{
  folderId: string;
  folderUrl: string;
  masterDocId: string;
  masterDocUrl: string;
  sourceDocId: string;
}> {
  const sourceId = extractDocId(sourceDocUrlOrId);
  if (!sourceId) {
    throw new Error("Could not extract a Google Doc ID from that URL.");
  }
  const folder = await ensureJobSearchFolder(accessToken);
  const existing = await findFileByName(accessToken, MASTER_RESUME_NAME, folder.id);
  if (existing) {
    const drive = driveClient(accessToken);
    await drive.files.delete({ fileId: existing.id });
  }
  const copied = await copyDoc(accessToken, sourceId, MASTER_RESUME_NAME, folder.id);
  return {
    folderId: folder.id,
    folderUrl: folder.url,
    masterDocId: copied.id,
    masterDocUrl: copied.url,
    sourceDocId: sourceId,
  };
}

/**
 * Find the user's master resume in Drive by convention:
 * "Job Search" > "Master Resume".
 */
export async function findMasterResume(accessToken: string): Promise<{ id: string; url: string } | null> {
  const folder = await ensureJobSearchFolder(accessToken);
  return findFileByName(accessToken, MASTER_RESUME_NAME, folder.id);
}

/**
 * Register a user's stories doc from a Google Doc URL. Same idempotent
 * pattern as registerMasterResume — a prior "Stories" doc is deleted and
 * replaced with a fresh copy of the source.
 */
export async function registerStoriesDoc(
  accessToken: string,
  sourceDocUrlOrId: string,
): Promise<{
  folderId: string;
  folderUrl: string;
  storiesDocId: string;
  storiesDocUrl: string;
  sourceDocId: string;
}> {
  const sourceId = extractDocId(sourceDocUrlOrId);
  if (!sourceId) {
    throw new Error("Could not extract a Google Doc ID from that URL.");
  }
  const folder = await ensureJobSearchFolder(accessToken);
  const existing = await findFileByName(accessToken, STORIES_NAME, folder.id);
  if (existing) {
    const drive = driveClient(accessToken);
    await drive.files.delete({ fileId: existing.id });
  }
  const copied = await copyDoc(accessToken, sourceId, STORIES_NAME, folder.id);
  return {
    folderId: folder.id,
    folderUrl: folder.url,
    storiesDocId: copied.id,
    storiesDocUrl: copied.url,
    sourceDocId: sourceId,
  };
}

/**
 * Find the user's stories doc in Drive by convention:
 * "Job Search" > "Stories". Returns null if the user hasn't added stories
 * yet — consumers should degrade gracefully.
 */
export async function findStoriesDoc(accessToken: string): Promise<{ id: string; url: string } | null> {
  const folder = await ensureJobSearchFolder(accessToken);
  return findFileByName(accessToken, STORIES_NAME, folder.id);
}

export type ApplicationSummary = {
  id: string;
  name: string;
  url: string;
  createdTime: string;
  modifiedTime: string;
};

/**
 * List every per-job subfolder inside the user's Job Search folder.
 * Each subfolder was created by /api/tailor when they applied to a job,
 * so this doubles as their application history — no database required.
 * Drive IS the database.
 */
export async function listApplications(
  accessToken: string,
  limit = 25,
): Promise<ApplicationSummary[]> {
  const drive = driveClient(accessToken);
  const folder = await ensureJobSearchFolder(accessToken);
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and '${folder.id}' in parents and trashed=false`,
    fields: "files(id, name, createdTime, modifiedTime)",
    orderBy: "createdTime desc",
    pageSize: limit,
  });
  return (res.data.files ?? [])
    .filter((f) => !!f.id && !!f.name)
    .map((f) => ({
      id: f.id!,
      name: f.name!,
      url: `https://drive.google.com/drive/folders/${f.id}`,
      createdTime: f.createdTime ?? "",
      modifiedTime: f.modifiedTime ?? "",
    }));
}

/**
 * @deprecated use registerMasterResume + copyDoc instead. Left here so
 * the previous /api/resume/save route keeps compiling until removed.
 */
export async function createTextDoc(
  accessToken: string,
  title: string,
  content: string,
  parentFolderId?: string,
): Promise<{ id: string; url: string }> {
  const drive = driveClient(accessToken);
  const docs = docsClient(accessToken);

  const meta = await drive.files.create({
    requestBody: {
      name: title,
      mimeType: "application/vnd.google-apps.document",
      parents: parentFolderId ? [parentFolderId] : undefined,
    },
    fields: "id",
  });
  const id = meta.data.id!;

  if (content) {
    await docs.documents.batchUpdate({
      documentId: id,
      requestBody: {
        requests: [{ insertText: { location: { index: 1 }, text: content } }],
      },
    });
  }

  return { id, url: `https://docs.google.com/document/d/${id}/edit` };
}
