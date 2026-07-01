import type { LucideIcon } from 'lucide-react';

interface DashboardPlaceholderWidgetProps {
  title: string;
  icon: LucideIcon;
  text: string;
}

/**
 * Non-clickable widget shell for Dashboard sections whose data source
 * (economic calendar feed, news feed) doesn't exist yet — Commit 009.
 */
export function DashboardPlaceholderWidget({
  title,
  icon: Icon,
  text,
}: DashboardPlaceholderWidgetProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
        {title}
      </h3>
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
        <Icon size={18} className="text-text-faint" />
        <p className="text-xs text-text-muted">{text}</p>
      </div>
    </div>
  );
}
