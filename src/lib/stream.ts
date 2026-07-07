import { anthropic, MODEL } from "@/lib/anthropic";
import { StreamHumanizer } from "@/lib/humanize";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

export type StreamOptions = {
  system: string;
  messages: MessageParam[];
  maxTokens?: number;
  model?: string;
  /**
   * Runs after Claude's stream finishes but before the "done" event is sent.
   * Whatever it returns gets merged into the done payload — use it to save
   * the completed output to Drive / Gmail / a database and forward the URL.
   * Throws are caught and reported via a `saveError` field on the done
   * event so the client still gets a signal that streaming completed.
   */
  onComplete?: (fullText: string) => Promise<Record<string, unknown> | void>;
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

      const humanizer = new StreamHumanizer();
      let accumulated = "";

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
            const cleaned = humanizer.push(event.delta.text);
            if (cleaned) {
              accumulated += cleaned;
              send("delta", { text: cleaned });
            }
          }
        }

        const tail = humanizer.flush();
        if (tail) {
          accumulated += tail;
          send("delta", { text: tail });
        }

        const final = await stream.finalMessage();
        let extra: Record<string, unknown> = {
          usage: final.usage,
          stopReason: final.stop_reason,
        };
        if (opts.onComplete) {
          try {
            const returned = await opts.onComplete(accumulated);
            if (returned) extra = { ...extra, ...returned };
          } catch (err) {
            extra.saveError = err instanceof Error ? err.message : "save failed";
          }
        }
        send("done", extra);
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
