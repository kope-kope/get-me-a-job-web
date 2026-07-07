import type { ExampleStory } from "@/lib/example-stories";

/**
 * Renders a single STAR story with distinct labels. Approximates the shape
 * of what should live in the user's Stories Google Doc.
 */
export function StarStoryPreview({ story }: { story: ExampleStory }) {
  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-white p-6 dark:bg-neutral-950">
      <header>
        <h3 className="text-base font-semibold">{story.title}</h3>
        {story.themes.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {story.themes.map((t) => (
              <span
                key={t}
                className="rounded-full bg-[var(--color-subtle)] px-2 py-0.5 text-xs text-[var(--color-muted)]"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </header>

      <dl className="mt-4 space-y-3 text-sm leading-relaxed">
        <Row label="Situation" body={story.situation} />
        <Row label="Task" body={story.task} />
        <Row label="Action" body={story.action} />
        <Row label="Result" body={story.result} />
        <Row label="Takeaway" body={story.takeaway} muted />
      </dl>
    </article>
  );
}

function Row({ label, body, muted }: { label: string; body: string; muted?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </dt>
      <dd className={"mt-1 " + (muted ? "text-[var(--color-muted)] italic" : "")}>{body}</dd>
    </div>
  );
}
