import { config } from 'dotenv';
import { createAdminClient } from '@/lib/supabase/admin';

config({ path: '.env.local' });

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

interface Link {
  id: string;
  product_id: string;
  url_template: string;
}

function parsePriceFromHtml(html: string): number | null {
  // og:title example: "Sony WH-1000XM5 Wireless Over-ear, från 2 553 kr i butiker på Prisjakt"
  const ogMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/);
  if (ogMatch) {
    const text = ogMatch[1];
    const price = text.match(/från\s+([\d\s]+)\s*kr/i);
    if (price) {
      const num = parseInt(price[1].replace(/\s+/g, ''), 10);
      if (Number.isFinite(num) && num > 0) return num;
    }
  }
  // Fallback: og:description "från X kr"
  const descMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/);
  if (descMatch) {
    const text = descMatch[1];
    const price = text.match(/från\s+([\d\s]+)\s*kr/i);
    if (price) {
      const num = parseInt(price[1].replace(/\s+/g, ''), 10);
      if (Number.isFinite(num) && num > 0) return num;
    }
  }
  return null;
}

async function fetchPrice(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'sv-SE,sv;q=0.9' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parsePriceFromHtml(html);
  } catch {
    return null;
  }
}

async function main() {
  const limitArg = process.argv[2];
  const limit = limitArg ? parseInt(limitArg, 10) : 50;
  const supabase = createAdminClient();

  // Pick Prisjakt links that don't have a recent price
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: links, error } = await supabase
    .from('affiliate_links')
    .select('id, product_id, url_template, last_checked_at')
    .eq('retailer', 'Prisjakt')
    .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`)
    .like('url_template', '%prisjakt.nu/produkt%')
    .limit(limit);
  if (error) throw error;

  const targets = (links ?? []) as Link[];
  console.log(`Fetching prices for ${targets.length} Prisjakt links...`);

  let ok = 0;
  let none = 0;
  for (const link of targets) {
    const price = await fetchPrice(link.url_template);
    const update: { last_checked_at: string; price_current?: number } = {
      last_checked_at: new Date().toISOString(),
    };
    if (price !== null) {
      update.price_current = price;
      ok += 1;
      if (ok % 10 === 0) console.log(`  +${ok} prices fetched`);
    } else {
      none += 1;
    }
    await supabase.from('affiliate_links').update(update as never).eq('id', link.id);
    await new Promise((r) => setTimeout(r, 800));
  }
  console.log(`\nDone. ${ok} prices, ${none} missing.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
