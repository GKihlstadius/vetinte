import { rtingsParser } from './rtings';
import { m3Parser } from './m3';
import { ljudochbildParser } from './ljudochbild';
import type { Parser, ParsedReview } from './types';

const PARSERS: Parser[] = [rtingsParser, m3Parser, ljudochbildParser];

export function parseReview(url: string, html: string): ParsedReview | null {
  const parser = PARSERS.find((p) => p.canParse(url));
  if (!parser) return null;
  return parser.parse(html, url);
}

export { PARSERS };
