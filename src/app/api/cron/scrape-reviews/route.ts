import type { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ingestOne, type IngestTask } from '@/lib/scraper/ingest';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const filePath = path.join(process.cwd(), 'seed-data', 'ingest-tasks.json');
  const tasks: IngestTask[] = JSON.parse(readFileSync(filePath, 'utf8'));

  const results = [];
  for (const task of tasks) {
    try {
      const r = await ingestOne(task);
      results.push(r);
    } catch (e) {
      results.push({ url: task.url, ok: false, reason: (e as Error).message });
    }
  }
  return Response.json({ results });
}
