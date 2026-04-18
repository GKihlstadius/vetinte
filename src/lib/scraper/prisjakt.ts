import * as cheerio from 'cheerio';

export interface PrisjaktProduct {
  prisjakt_id: string;
  brand: string;
  model: string;
  full_name: string;
  category_text: string;
  product_url: string;
  image_url: string;
  buy_search_url: string;
}

const KNOWN_BRANDS = [
  'Apple', 'Sony', 'Bose', 'Sennheiser', 'Samsung', 'Bowers & Wilkins', 'B&W', 'Beats',
  'JBL', 'Marshall', 'Audio-Technica', 'AKG', 'Anker', 'Soundcore', 'Anker Soundcore',
  'Nothing', 'OnePlus', 'Huawei', 'Xiaomi', 'Jabra', 'Skullcandy', 'Razer', 'Beyerdynamic',
  'Focal', 'Shure', 'Ultimate Ears', 'Logitech', 'Microsoft', 'Google', 'Nokia',
  'Asus', 'Lenovo', 'HP', 'Dell', 'Acer', 'MSI', 'LG', 'Philips', 'Yamaha', 'Devialet',
  'KEF', 'Polk', 'Klipsch', 'Pioneer', 'Denon', 'Marantz', 'Onkyo', 'Cambridge Audio',
  'Fitbit', 'Garmin', 'Polar', 'Suunto', 'Casio', 'Withings', 'Mobvoi', 'TicWatch',
  'Canon', 'Nikon', 'Fujifilm', 'Olympus', 'Panasonic', 'Leica', 'Hasselblad', 'GoPro', 'DJI', 'Insta360',
  'L\'Oréal', 'Loreal', 'Maybelline', 'Lancôme', 'Lancome', 'Dior', 'YSL', 'Chanel', 'Estée Lauder', 'Estee Lauder',
  'Clinique', 'Charlotte Tilbury', 'Caia', 'Idun Minerals', 'IsaDora', 'KICKS', 'Bobbi Brown',
  'Clarins', 'The Ordinary', 'Paula\'s Choice', 'Medik8', 'Dermaceutic', 'La Roche-Posay',
  'Garnier', 'Beyerdynamic', 'Filorga', 'Kiehl\'s', 'Lumene', 'SkinCeuticals', 'Ole Henriksen',
  'Dermalogica', 'Lernberger Stafsings', 'Beaut Pacifique', 'Aim\'n', 'Aimn', 'Röhnisch', 'Rohnisch',
  'Arket', 'Ninepine', 'ICIW', 'Adidas', 'Nike', 'Sudio', 'Sennheiser',
  'Sennheiser', 'Realme', 'Honor', 'Vivo', 'Oppo', 'TCL', 'Hisense',
];

const CATEGORY_KEYWORDS = /\b(In[- ]ear|Over[- ]ear|On[- ]ear|hörlurar|Headphones|Earbuds|Smartphone|Mobil|Tablet|Surfplatta|Laptop|Bärbar|TV|Klocka|Watch|Smartklocka|Kamera|Camera|Mascara|Foundation|Serum|Hudvård|Tights|Leggings|Skor|Sneakers|Speaker|Högtalare|Wireless|Trådlös|Active|Adaptive|2nd Generation|with .*|för .*|–|—|\(|,)/i;

function cleanText(t: string): string {
  return t
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, '') // zero-width chars
    .replace(/\s+/g, ' ')
    .trim();
}

function splitBrandModel(text: string): { brand: string; model: string } | null {
  const cleaned = cleanText(text);
  const sortedBrands = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length);
  for (const brand of sortedBrands) {
    if (cleaned.toLowerCase().startsWith(brand.toLowerCase() + ' ')) {
      const rest = cleaned.slice(brand.length + 1);
      // Take everything until first category keyword
      const m = rest.search(CATEGORY_KEYWORDS);
      const model = (m > 0 ? rest.slice(0, m) : rest).trim();
      if (model.length === 0 || model.length > 80) return null;
      return { brand, model };
    }
  }
  // Fallback: first word as brand, next 2-4 words as model up to keyword
  const m = cleaned.search(CATEGORY_KEYWORDS);
  const head = (m > 0 ? cleaned.slice(0, m) : cleaned).trim();
  const parts = head.split(/\s+/);
  if (parts.length < 2) return null;
  return { brand: parts[0], model: parts.slice(1).join(' ').slice(0, 80) };
}

export function parsePrisjaktCategory(html: string): PrisjaktProduct[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const out: PrisjaktProduct[] = [];

  $('a[href*="/produkt.php?p="]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') ?? '';
    const m = href.match(/\/produkt\.php\?p=(\d+)/);
    if (!m) return;
    const id = m[1];
    if (seen.has(id)) return;
    const text = cleanText($a.text());
    if (!text || text.length < 5) return;

    const split = splitBrandModel(text);
    if (!split) return;

    seen.add(id);
    const productUrl = `https://www.prisjakt.nu/produkt.php?p=${id}`;
    const imageUrl = `https://pricespy-75b8.kxcdn.com/product/standard/800/${id}.jpg`;
    const categoryText = text.slice(0, 200);

    out.push({
      prisjakt_id: id,
      brand: split.brand,
      model: split.model,
      full_name: `${split.brand} ${split.model}`,
      category_text: categoryText,
      product_url: productUrl,
      image_url: imageUrl,
      buy_search_url: productUrl,
    });
  });

  return out;
}
