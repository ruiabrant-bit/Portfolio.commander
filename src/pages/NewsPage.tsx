import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ExternalLink, KeyRound, Newspaper } from 'lucide-react';
import { usePortfolioStore } from '../store/portfolioStore';
import { useFinnhubApiKey } from '../hooks/useFinnhubApiKey';
import { fetchCompanyNews, NewsDataError, type NewsArticle } from '../services/news/finnhubClient';

/**
 * News (PRD v1.1): portfolio-related news first. Since this only fetches
 * company news for assets already known to the app (imported via CSV or
 * added manually), every result is inherently portfolio-related — there
 * is no general market-news firehose mixed in to filter out.
 *
 * "AI summary for each article" is explicitly listed as future scope in
 * the PRD itself — not built here, matching that.
 */
export function NewsPage() {
  const { apiKey } = useFinnhubApiKey();
  const assets = usePortfolioStore((s) => s.assets);

  const queries = useQueries({
    queries: assets.map((asset) => ({
      queryKey: ['companyNews', asset.ticker, apiKey],
      queryFn: () => fetchCompanyNews(asset.ticker, apiKey as string),
      enabled: Boolean(apiKey),
      staleTime: 15 * 60 * 1000,
      retry: false,
    })),
  });

  const articles: NewsArticle[] = useMemo(() => {
    const all = queries.flatMap((q) => q.data ?? []);
    const seen = new Set<string>();
    return all
      .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  }, [queries]);

  const isLoading = queries.some((q) => q.isLoading);
  const firstError = queries.find((q) => q.error)?.error;

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center gap-3 p-16 text-center">
        <KeyRound size={20} className="text-text-faint" />
        <p className="text-sm text-text-muted">Connect a Finnhub API key to see news for your holdings.</p>
        <Link to="/settings" className="text-sm text-accent hover:underline">
          Go to Settings
        </Link>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-16 text-center">
        <Newspaper size={20} className="text-text-faint" />
        <p className="text-sm text-text-muted">No known assets yet — import a CSV first.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">News</h1>

      {isLoading && articles.length === 0 && (
        <p className="py-8 text-center text-sm text-text-muted">Loading news…</p>
      )}

      {firstError && articles.length === 0 && (
        <p className="py-8 text-center text-sm text-negative">
          {firstError instanceof NewsDataError ? firstError.message : 'Failed to load news.'}
        </p>
      )}

      {!isLoading && articles.length === 0 && !firstError && (
        <p className="py-8 text-center text-sm text-text-muted">No recent news for your holdings.</p>
      )}

      <ul className="flex flex-col gap-2">
        {articles.map((article) => (
          <li key={article.id} className="rounded-lg border border-border bg-surface p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-text-faint">
              <span className="rounded bg-surface-raised px-1.5 py-0.5 font-data">
                {article.relatedTicker}
              </span>
              <span>{article.source}</span>
              <span>·</span>
              <span>{new Date(article.datetime).toLocaleDateString()}</span>
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1.5 text-sm font-medium hover:text-accent"
            >
              {article.headline}
              <ExternalLink size={12} className="mt-0.5 shrink-0 text-text-faint" />
            </a>
            {article.summary && (
              <p className="mt-1 line-clamp-2 text-xs text-text-muted">{article.summary}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
