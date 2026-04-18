import type { RetrievedProduct, RetrievedChunk } from '@/lib/rag/retrieve';
import type { LLMMessage } from '@/lib/llm/types';

export interface BuildPromptParams {
  userMessage: string;
  products: RetrievedProduct[];
  chunks?: RetrievedChunk[];
  userFacts: string[];
  recentMessages: LLMMessage[];
  locale: 'sv' | 'en';
}

const TONE_HINT_SV: Record<string, string> = {
  casual: 'Skriv som en varm och avslappnad kompis. Använd "du", korta meningar.',
  formal: 'Var saklig och artig. Vouvoyering är inte nödvändigt men håll tonen professionell.',
  direct: 'Var maximalt rak och kort. Inga utfyllnadsord, inga ursäkter, kom till saken.',
  funny: 'Använd torr, vänlig humor när det passar. Var inte kraschig.',
};

const TONE_HINT_EN: Record<string, string> = {
  casual: 'Write like a warm, relaxed friend. Use simple, short sentences.',
  formal: 'Be polite and businesslike. Keep it professional without being stiff.',
  direct: 'Be maximally blunt and brief. No filler, no apologies, get to the point.',
  funny: 'Use dry, friendly humour when it fits. Never crude.',
};

export function buildSystemPrompt({
  locale,
  tone = 'casual',
}: {
  locale: 'sv' | 'en';
  tone?: 'casual' | 'formal' | 'direct' | 'funny';
}): string {
  const sv = `Du är Betyget, en kunnig kompis som hjälper användare hitta de bästa produkterna inom det de söker.
${TONE_HINT_SV[tone] ?? TONE_HINT_SV.casual}
Svara alltid på svenska. Undvik svammel och säljspråk. Var konkret.
Använd endast produkt-slugs från listan under "TILLGÄNGLIGA PRODUKTER". Hitta inte på produkter eller specs.
Returnera strukturerat JSON enligt det angivna schemat. Välj format baserat på frågan:
- Specifik köpfråga (1 produkt): ett eller tre product_card-block med "angle" som summerar varför.
- Utforskande fråga (flera kandidater): comparison_table med 3-5 produkter.
- Påstående som bevisas av test: inkludera ett quote-block med citat och källa.
Om användaren frågar om en produkt eller kategori du inte har data på: var ärlig och säg det rakt ut.`;

  const en = `You are Betyget, a knowledgeable friend helping users find the best products in whatever they are looking for.
${TONE_HINT_EN[tone] ?? TONE_HINT_EN.casual}
Always respond in English. Avoid fluff and salesy language. Be concrete.
Only use product slugs from the "AVAILABLE PRODUCTS" list. Do not invent products or specs.
Return structured JSON matching the schema. Choose format based on the question:
- Specific purchase question: one or three product_card blocks with "angle" summarising why.
- Exploratory question: comparison_table with 3-5 products.
- Claim backed by a test: include a quote block with citation.
If the user asks about a product or category you do not have data on, be honest about it.`;

  return locale === 'sv' ? sv : en;
}

export function buildUserPrompt(params: BuildPromptParams): string {
  const { userMessage, products, chunks, userFacts, recentMessages, locale } = params;
  const lines: string[] = [];

  if (userFacts.length > 0) {
    lines.push(locale === 'sv' ? 'VAD VI VET OM ANVÄNDAREN:' : 'WHAT WE KNOW ABOUT THE USER:');
    for (const f of userFacts) lines.push(`- ${f}`);
    lines.push('');
  }

  lines.push(locale === 'sv' ? 'TILLGÄNGLIGA PRODUKTER:' : 'AVAILABLE PRODUCTS:');
  for (const p of products) {
    const summary =
      locale === 'sv' ? (p.summary_sv ?? p.summary_en ?? '') : (p.summary_en ?? p.summary_sv ?? '');
    lines.push(
      `- slug: ${p.slug} | ${p.brand} ${p.model} | ${p.category_path ?? p.category} | specs: ${JSON.stringify(p.specs_json)} | ${summary}`
    );
  }
  lines.push('');

  if (chunks && chunks.length > 0) {
    lines.push(locale === 'sv' ? 'RELEVANT EVIDENS FRÅN TESTER:' : 'RELEVANT TEST EVIDENCE:');
    const byProduct = new Map<string, string[]>();
    for (const c of chunks.slice(0, 8)) {
      if (!byProduct.has(c.product_id)) byProduct.set(c.product_id, []);
      byProduct.get(c.product_id)!.push(c.chunk_text.slice(0, 500));
    }
    for (const [productId, texts] of byProduct) {
      const p = products.find((pp) => pp.id === productId);
      const label = p ? `${p.brand} ${p.model}` : productId;
      for (const t of texts) lines.push(`- [${label}] ${t}`);
    }
    lines.push('');
  }

  if (recentMessages.length > 0) {
    lines.push(locale === 'sv' ? 'SENASTE SAMTALET:' : 'RECENT CONVERSATION:');
    for (const m of recentMessages) lines.push(`${m.role}: ${m.content}`);
    lines.push('');
  }

  lines.push(locale === 'sv' ? 'ANVÄNDARENS FRÅGA:' : 'USER QUESTION:');
  lines.push(userMessage);

  return lines.join('\n');
}
