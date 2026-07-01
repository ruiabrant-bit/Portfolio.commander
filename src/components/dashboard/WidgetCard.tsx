import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface WidgetCardProps {
  title: string;
  to?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Every Dashboard widget is wrapped in this shell so the "clicking any
 * widget opens the related page" rule (PRD v1.1/v1.3) is enforced in one
 * place rather than per-widget.
 */
export function WidgetCard({ title, to, children, className = '' }: WidgetCardProps) {
  const navigate = useNavigate();
  const clickable = Boolean(to);

  return (
    <div
      onClick={clickable ? () => navigate(to!) : undefined}
      className={`rounded-lg border border-border bg-surface p-4 ${
        clickable ? 'cursor-pointer transition-colors hover:border-border-strong' : ''
      } ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {title}
        </h3>
        {clickable && <ChevronRight size={14} className="text-text-faint" />}
      </div>
      {children}
    </div>
  );
}
