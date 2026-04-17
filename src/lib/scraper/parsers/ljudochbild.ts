import * as cheerio from 'cheerio';
import type { Parser, ParsedReview } from './types';

export const ljudochbildParser: Parser = {
  publisher: 'Ljud & Bild',
  canParse(url) {
    return url.includes('ljudochbild.se/');
  },
  parse(html, url): ParsedReview | null {
    const $ = cheerio.load(html);
    const title =
      ($('h1').first().text() || $('meta[property="og:title"]').attr('content') || '')
        .replace(/\s+/g, ' ')
        .trim() || null;

    const paragraphs: string[] = [];
    $('article p, .article-body p, .entry-content p, main p').each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      if (t.length > 40) paragraphs.push(t);
    });
    const body = paragraphs.join('\n\n');
    if (body.length < 300) return null;

    const timeAttr = $('time[datetime], meta[property="article:published_time"]')
      .first()
      .attr('datetime') ||
      $('meta[property="article:published_time"]').attr('content') ||
      null;

    return {
      publisher: 'Ljud & Bild',
      url,
      title,
      published_at: timeAttr,
      rating_normalized: null,
      raw_text: body,
    };
  },
};
