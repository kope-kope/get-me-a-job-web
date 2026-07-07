/**
 * Minimal server-sent-events client for our Claude / Drive routes.
 */
export type SSEHandlers = {
  onDelta?: (text: string) => void;
  onEvent?: (event: string, data: unknown) => void;
};

export async function streamSSE(url: string, body: unknown, handlers: SSEHandlers): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const eventType = chunk.match(/^event: (.+)$/m)?.[1];
      const dataLine = chunk.match(/^data: (.+)$/m)?.[1];
      if (!dataLine) continue;
      const data = JSON.parse(dataLine);
      if (eventType === "delta" && typeof (data as { text?: string }).text === "string") {
        handlers.onDelta?.((data as { text: string }).text);
      } else if (eventType === "error") {
        throw new Error((data as { message?: string }).message ?? "stream error");
      } else if (eventType) {
        handlers.onEvent?.(eventType, data);
      }
    }
  }
}

// Back-compat helper used by legacy callers.
export async function streamText(
  url: string,
  body: unknown,
  onDelta: (chunk: string) => void,
): Promise<void> {
  return streamSSE(url, body, { onDelta });
}
