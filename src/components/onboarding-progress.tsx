export function OnboardingProgress({ step, total = 3 }: { step: number; total?: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
      <span>
        Step {step} of {total}
      </span>
      <span className="h-[2px] flex-1 bg-[var(--color-border)]">
        <span
          className="block h-full bg-[var(--color-accent)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
