import type { RetrievedProduct } from '@/lib/rag/retrieve';
import type { LLMMessage } from '@/lib/llm/types';

export interface BuildPromptParams {
  userMessage: string;
  products: RetrievedProduct[];
  userFacts: string[];
  recentMessages: LLMMessage[];
  locale: 'sv' | 'en';
}

export function buildSystemPrompt({ locale }: { locale: 'sv' | 'en' }): string {
  const sv = `Du är Betyget, en varm och kunnig kompis som hjälper användare hitta bästa hörlurarna för deras behov.
Svara alltid på svenska. Var konkret och rak, undvik svammel. Håll tonen som en knowledgeable vän, inte som en säljare.
Använd endast produkt-slugs från listan under "TILLGÄNGLIGA PRODUKTER". Hitta inte på produkter.
Returnera strukturerat JSON enligt det angivna schemat. Välj format baserat på frågan:
- Specifik köpfråga (1 produkt): ett eller tre product_card-block med "angle" som summerar varför.
- Utforskande fråga (flera kandidater): comparison_table med 3-5 produkter.
- Påstående som bevisas av test: inkludera ett quote-block med citat och källa.
Om användaren frågar om en produkt som inte finns i listan, var ärlig och säg att du inte har djup data där ännu.`;

  const en = `You are Betyget, a warm and knowledgeable friend helping users find the best headphones for their needs.
Always respond in English. Be concrete and direct, avoid fluff. Keep the tone of a knowledgeable friend, not a salesperson.
Only use product slugs from the "AVAILABLE PRODUCTS" list. Do not make up products.
Return structured JSON matching the schema. Choose format based on the question:
- Specific purchase question: one or three product_card blocks with "angle" summarising why.
- Exploratory question: comparison_table with 3-5 products.
- Claim backed by a test: include a quote block with citation.
If the user asks about a product not in the list, be honest that you do not have deep data on it yet.`;

  return locale === 'sv' ? sv : en;
}

export function buildUserPrompt(params: BuildPromptParams): string {
  const { userMessage, products, userFacts, recentMessages, locale } = params;
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
      `- slug: ${p.slug} | ${p.brand} ${p.model} | ${p.category} | specs: ${JSON.stringify(p.specs_json)} | ${summary}`
    );
  }
  lines.push('');

  if (recentMessages.length > 0) {
    lines.push(locale === 'sv' ? 'SENASTE SAMTALET:' : 'RECENT CONVERSATION:');
    for (const m of recentMessages) lines.push(`${m.role}: ${m.content}`);
    lines.push('');
  }

  lines.push(locale === 'sv' ? 'ANVÄNDARENS FRÅGA:' : 'USER QUESTION:');
  lines.push(userMessage);

  return lines.join('\n');
}
