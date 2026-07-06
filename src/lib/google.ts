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
