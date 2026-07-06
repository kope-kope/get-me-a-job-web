/**
 * Minimal server-sent-events client for streaming Claude responses.
 * Yields text deltas until the stream is done.
 */
export async function streamText(
  url: string,
  body: unknown,
  onDelta: (chunk: string) => void,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const evt of events) {
      const eventType = evt.match(/^event: (.+)$/m)?.[1];
      const dataLine = evt.match(/^data: (.+)$/m)?.[1];
      if (!dataLine) continue;
      const data = JSON.parse(dataLine);
      if (eventType === "delta") {
        onDelta(data.text);
      } else if (eventType === "error") {
        throw new Error(data.message);
      }
    }
  }
}
