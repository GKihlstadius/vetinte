interface CrawlResponse {
  success: boolean;
  result?: {
    id: string;
    status: string;
    pages?: CrawledPage[];
  };
  errors?: Array<{ message: string }>;
}

interface CrawledPage {
  url: string;
  status: number;
  html?: string;
  markdown?: string;
}

interface CrawlOptions {
  url: string;
  maxPages?: number;
  filterPatterns?: string[];
  render?: boolean;
}

const CF_API_BASE = 'https://api.cloudflare.com/client/v4/accounts';

export async function startCrawl(options: CrawlOptions): Promise<string> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error('Cloudflare credentials not configured');
  }

  const body: Record<string, unknown> = { url: options.url };
  if (options.maxPages) body.maxPages = options.maxPages;
  if (options.filterPatterns) body.filterPatterns = options.filterPatterns;
  if (options.render !== undefined) body.render = options.render;

  const res = await fetch(`${CF_API_BASE}/${accountId}/browser-rendering/crawl`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data: CrawlResponse = await res.json();
  if (!data.success || !data.result?.id) {
    const msg = data.errors?.[0]?.message || 'Unknown crawl error';
    throw new Error(`Cloudflare crawl failed: ${msg}`);
  }
  return data.result.id;
}

export async function getCrawlResult(jobId: string): Promise<CrawledPage[]> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;

  const res = await fetch(`${CF_API_BASE}/${accountId}/browser-rendering/crawl/${jobId}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });

  const data: CrawlResponse = await res.json();
  if (!data.success) throw new Error('Failed to get crawl result');
  if (data.result?.status === 'complete' && data.result.pages) return data.result.pages;
  if (data.result?.status === 'running') return [];
  throw new Error(`Unexpected crawl status: ${data.result?.status}`);
}

export async function crawlAndWait(options: CrawlOptions): Promise<CrawledPage[]> {
  const jobId = await startCrawl(options);
  const maxWait = 120_000;
  const interval = 3_000;
  let elapsed = 0;
  while (elapsed < maxWait) {
    await new Promise((r) => setTimeout(r, interval));
    elapsed += interval;
    const pages = await getCrawlResult(jobId);
    if (pages.length > 0) return pages;
  }
  throw new Error('Crawl timed out');
}

export interface RenderOptions {
  forceCF?: boolean;
  waitFor?: string;
}

export async function renderPage(url: string, options: RenderOptions = {}): Promise<string> {
  if (options.forceCF) {
    const cfHtml = await renderWithCF(url, options.waitFor);
    if (!cfHtml) throw new Error(`CF render failed for ${url}`);
    return cfHtml;
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BetygetBot/1.0)' },
      signal: AbortSignal.timeout(15_000),
    });
    const html = await res.text();
    const looksLikeSPA =
      html.includes('var GLOBALS =') || html.length < 5000 || !html.includes('</p>');
    if (!looksLikeSPA) return html;
    const cfHtml = await renderWithCF(url, options.waitFor);
    return cfHtml || html;
  } catch {
    const cfHtml = await renderWithCF(url, options.waitFor);
    if (cfHtml) return cfHtml;
    throw new Error(`Failed to fetch ${url}`);
  }
}

let lastCFRequest = 0;
const CF_MIN_DELAY = 2000;

async function renderWithCF(url: string, waitFor?: string): Promise<string | null> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) return null;

  const now = Date.now();
  const timeSinceLast = now - lastCFRequest;
  if (timeSinceLast < CF_MIN_DELAY) {
    await new Promise((r) => setTimeout(r, CF_MIN_DELAY - timeSinceLast));
  }
  lastCFRequest = Date.now();

  try {
    const res = await fetch(`${CF_API_BASE}/${accountId}/browser-rendering/content`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, ...(waitFor && { waitFor }) }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      if (res.status === 429) lastCFRequest = Date.now() + 5000;
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return (data as { result?: string }).result || null;
    }
    return await res.text();
  } catch {
    return null;
  }
}
