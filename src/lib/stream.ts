import { anthropic, MODEL } from "@/lib/anthropic";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

export type StreamOptions = {
  system: string;
  messages: MessageParam[];
  maxTokens?: number;
  model?: string;
};

/**
 * Turn a Claude streaming completion into a text/event-stream Response.
 * Client reads with EventSource or fetch+ReadableStream.
 */
export function streamClaudeResponse(opts: StreamOptions): Response {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const stream = anthropic().messages.stream({
          model: opts.model ?? MODEL,
          max_tokens: opts.maxTokens ?? 4096,
          system: opts.system,
          messages: opts.messages,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send("delta", { text: event.delta.text });
          }
        }

        const final = await stream.finalMessage();
        send("done", { usage: final.usage, stopReason: final.stop_reason });
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "stream failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
