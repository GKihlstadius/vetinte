export interface ParsedReview {
  publisher: string;
  url: string;
  title: string | null;
  published_at: string | null;
  rating_normalized: number | null;
  raw_text: string;
}

export interface Parser {
  publisher: string;
  canParse(url: string): boolean;
  parse(html: string, url: string): ParsedReview | null;
}
