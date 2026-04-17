import * as cheerio from 'cheerio';
import type { Parser, ParsedReview } from './types';

export const m3Parser: Parser = {
  publisher: 'M3',
  canParse(url) {
    return url.includes('m3.se/article/');
  },
  parse(html, url): ParsedReview | null {
    const $ = cheerio.load(html);
    const title =
      ($('h1').first().text() || $('meta[property="og:title"]').attr('content') || '')
        .replace(/\s+/g, ' ')
        .trim() || null;

    const paragraphs: string[] = [];
    $('article p, main p').each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      if (t.length > 40) paragraphs.push(t);
    });
    const body = paragraphs.join('\n\n');
    if (body.length < 300) return null;

    const timeAttr = $('article time, time[datetime]').first().attr('datetime') || null;

    return {
      publisher: 'M3',
      url,
      title,
      published_at: timeAttr,
      rating_normalized: null,
      raw_text: body,
    };
  },
};
