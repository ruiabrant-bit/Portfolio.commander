import { useMemo, useState } from 'react';
import { Sparkles, Send, Info } from 'lucide-react';
import { usePortfolioStore } from '../store/portfolioStore';
import { usePortfolioSnapshot } from '../hooks/usePortfolioSnapshot';
import { answerQuery, EXAMPLE_QUERIES, type AIContext } from '../services/ai/aiCommander';
import { calculateMaxPositionWeight } from '../services/engines/riskEngine';
import { allocationBySector } from '../services/engines/allocationEngine';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  reasoning?: string[];
}

/**
 * AI Commander (PRD v1.3): "Ask anything" input + Conversation +
 * Suggested Actions + Portfolio Insights.
 *
 * IMPORTANT: this is a rule-based advisory engine reading Commander Core
 * data directly, not a language model. Calling the Anthropic API from
 * the browser would require shipping an API key in the client bundle,
 * which this app never does — a real LLM integration needs a backend
 * proxy, which isn't part of this local-first architecture yet. The
 * banner below states this to the end user, not just in code comments.
 */
export function AICommanderPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const portfolio = usePortfolioStore((s) => s.portfolio);
  const assets = usePortfolioStore((s) => s.assets);
  const snapshot = usePortfolioSnapshot();

  const ctx: AIContext | null = useMemo(() => {
    if (!snapshot || !portfolio) return null;
    return {
      positions: snapshot.positions,
      assets,
      portfolioValue: snapshot.portfolioValue,
      cash: snapshot.cash,
      baseCurrency: portfolio.baseCurrency,
    };
  }, [snapshot, portfolio, assets]);

  const insights = useMemo(() => {
    if (!ctx || ctx.positions.length === 0) return null;
    const maxWeight = calculateMaxPositionWeight(ctx.positions, ctx.portfolioValue);
    const sectorBuckets = allocationBySector(ctx.positions, ctx.assets);
    return {
      maxWeight,
      topSector: sectorBuckets[0] ?? null,
      sectorCount: sectorBuckets.length,
    };
  }, [ctx]);

  function handleAsk(query: string) {
    if (!query.trim() || !ctx) return;
    const response = answerQuery(query, ctx);
    setMessages((m) => [
      ...m,
      { role: 'user', text: query },
      { role: 'assistant', text: response.answer, reasoning: response.reasoning },
    ]);
    setInput('');
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col p-4 lg:p-6">
      <div className="mb-3 flex items-center gap-2 rounded-md border border-accent/30 bg-accent-muted px-3 py-2 text-xs text-accent">
        <Info size={14} className="shrink-0" />
        Rule-based portfolio assistant — reads your data directly, not a language model.
        A real AI backend would need a server-side proxy to keep API keys secure.
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={16} className="text-accent" />
        <h1 className="text-lg font-semibold tracking-tight">AI Commander</h1>
      </div>

      {/* Conversation */}
      <div className="mb-3 flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-surface p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            Ask about risk, diversification, or where to put new capital.
          </p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
              <div
                className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-left text-sm ${
                  m.role === 'user' ? 'bg-accent text-white' : 'bg-surface-raised text-text'
                }`}
              >
                {m.text}
              </div>
              {m.reasoning && m.reasoning.length > 0 && (
                <ul className="mt-1 space-y-0.5 pl-1 text-xs text-text-faint">
                  {m.reasoning.map((r, ri) => (
                    <li key={ri}>· {r}</li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>

      {/* Suggested Actions */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => handleAsk(q)}
            className="rounded-full border border-border px-3 py-1 text-xs text-text-muted hover:bg-surface-hover hover:text-text"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Ask anything input */}
      <div className="mb-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk(input)}
          placeholder="Ask anything…"
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
        <button
          onClick={() => handleAsk(input)}
          disabled={!input.trim()}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </div>

      {/* Portfolio Insights */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          Portfolio Insights
        </h2>
        {!insights ? (
          <p className="text-sm text-text-muted">No positions yet — insights will appear here.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            <li>
              Largest position weight:{' '}
              <span className="font-data">{(insights.maxWeight * 100).toFixed(1)}%</span>
            </li>
            <li>
              Sectors held: <span className="font-data">{insights.sectorCount}</span>
              {insights.topSector && (
                <>
                  {' '}
                  · largest is{' '}
                  <span className="font-medium">{insights.topSector.label}</span> (
                  {(insights.topSector.weight * 100).toFixed(1)}%)
                </>
              )}
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
