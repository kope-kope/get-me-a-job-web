import type {
  ExampleResume,
  ExperienceSection,
  EducationSection,
  AdditionalSection,
} from "@/lib/example-resume";

/**
 * Renders a resume in the Berkeley Haas Career Management Group (CMG) format:
 * centered bold-caps name, contact line, bold-caps section headers with
 * horizontal rules, company + city on the left with dates right-aligned,
 * italic role titles, disc bullets.
 *
 * The visual style approximates the CMG PDF format so users can eyeball the
 * shape of what they should upload as their master resume.
 */
export function CmgResumePreview({ data }: { data: ExampleResume }) {
  return (
    <article className="mx-auto max-w-[820px] bg-white p-10 text-[12.5px] leading-[1.5] text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-100">
      <Header data={data} />
      {data.sections.map((section, i) => {
        if (section.kind === "experience") return <Experience key={i} section={section} />;
        if (section.kind === "education") return <Education key={i} section={section} />;
        return <Additional key={i} section={section} />;
      })}
    </article>
  );
}

function Header({ data }: { data: ExampleResume }) {
  return (
    <header className="text-center">
      <h1 className="text-[22px] font-bold uppercase tracking-wide">{data.header.name}</h1>
      <p className="mt-1 text-[12px] text-neutral-700 dark:text-neutral-300">
        {data.header.contact.map((c, i) => (
          <span key={i}>
            {i > 0 && <span className="mx-1.5">·</span>}
            {c.href ? (
              <a href={c.href} target="_blank" rel="noreferrer" className="underline">
                {c.label}
              </a>
            ) : (
              c.label
            )}
          </span>
        ))}
      </p>
    </header>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mt-5 border-y border-neutral-800 py-1 text-center text-[13px] font-bold uppercase tracking-wide dark:border-neutral-200">
      {title}
    </div>
  );
}

function Experience({ section }: { section: ExperienceSection }) {
  return (
    <section>
      <SectionHeader title={section.title} />
      {section.entries.map((e, i) => (
        <div key={i} className="mt-3">
          <div className="flex items-baseline justify-between gap-4">
            <div className="font-bold">
              {e.organization}, <span className="font-normal">{e.location}</span>
            </div>
            <div className="whitespace-nowrap text-neutral-700 dark:text-neutral-300">
              {e.dates}
            </div>
          </div>
          {e.description && <p className="mt-0.5 italic text-neutral-700 dark:text-neutral-300">{e.description}</p>}
          <p className="mt-0.5 font-bold italic">{e.role}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {e.bullets.map((b, j) => (
              <li key={j}>{b}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Education({ section }: { section: EducationSection }) {
  return (
    <section>
      <SectionHeader title={section.title} />
      {section.entries.map((e, i) => (
        <div key={i} className="mt-3">
          <div className="flex items-baseline justify-between gap-4">
            <div className="font-bold">
              {e.school}, <span className="font-normal">{e.location}</span>
            </div>
            <div className="whitespace-nowrap text-neutral-700 dark:text-neutral-300">
              {e.dates}
            </div>
          </div>
          <p className="mt-0.5 italic">{e.degree}</p>
          {e.bullets && (
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {e.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}

function Additional({ section }: { section: AdditionalSection }) {
  return (
    <section>
      <SectionHeader title={section.title} />
      <ul className="mt-3 list-disc space-y-1 pl-5">
        {section.items.map((item, i) => (
          <li key={i}>
            <span className="font-bold">{item.label}:</span> {item.body}
          </li>
        ))}
      </ul>
    </section>
  );
}
