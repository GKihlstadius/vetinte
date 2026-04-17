export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    intro_md: { type: 'string' },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['product_card', 'comparison_table', 'video', 'quote'] },
          product_id: { type: 'string' },
          product_ids: { type: 'array', items: { type: 'string' } },
          angle: { type: 'string' },
          columns: { type: 'array', items: { type: 'string' } },
          youtube_id: { type: 'string' },
          caption: { type: 'string' },
          text: { type: 'string' },
          source: { type: 'string' },
        },
        required: ['type'],
      },
    },
    outro_md: { type: 'string' },
    followup_suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['intro_md', 'blocks', 'outro_md', 'followup_suggestions'],
};

export interface ChatResponse {
  intro_md: string;
  blocks: ChatBlock[];
  outro_md: string;
  followup_suggestions: string[];
}

export type ChatBlock =
  | { type: 'product_card'; product_id: string; angle: string }
  | { type: 'comparison_table'; product_ids: string[]; columns: string[] }
  | { type: 'video'; youtube_id: string; caption: string }
  | { type: 'quote'; text: string; source: string };
