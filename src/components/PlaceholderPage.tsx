import type { LucideIcon } from 'lucide-react';

interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  commitLabel: string;
}

/**
 * Used for modules whose implementation is scheduled for a later commit
 * per SFS Appendix A. Deliberately explicit about what's missing and
 * when it lands, rather than a silent blank screen — the navigation and
 * routing for the module are already real and functional in this commit.
 */
export function PlaceholderPage({
  icon: Icon,
  title,
  description,
  commitLabel,
}: PlaceholderPageProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface text-text-muted">
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">{description}</p>
      </div>
      <span className="rounded-full border border-border px-3 py-1 text-xs text-text-faint">
        {commitLabel}
      </span>
    </div>
  );
}
