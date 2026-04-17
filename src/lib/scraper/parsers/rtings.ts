import * as cheerio from 'cheerio';
import type { Parser, ParsedReview } from './types';

export const rtingsParser: Parser = {
  publisher: 'RTINGS',
  canParse(url) {
    return url.includes('rtings.com/headphones/reviews/');
  },
  parse(html, url): ParsedReview | null {
    const $ = cheerio.load(html);

    const title = ($('h1').first().text() || $('meta[property="og:title"]').attr('content') || '')
      .replace(/\s+/g, ' ')
      .trim() || null;

    const paragraphs: string[] = [];
    $('article p, main p, .product-review p, .review-body p, section p').each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      if (t.length > 40) paragraphs.push(t);
    });
    let body = paragraphs.join('\n\n');
    if (body.length < 500) {
      const fallback = $('body')
        .text()
        .replace(/\s+/g, ' ')
        .trim();
      body = fallback;
    }

    const scoreText = $('.score_box-value, .product-page-score').first().text().trim();
    const score = parseFloat(scoreText);
    const rating = Number.isFinite(score) && score > 0 ? score : null;

    return {
      publisher: 'RTINGS',
      url,
      title,
      published_at: null,
      rating_normalized: rating,
      raw_text: body,
    };
  },
};
