import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { ingestOne, type IngestTask } from '@/lib/scraper/ingest';

config({ path: '.env.local' });

async function main() {
  const file = process.argv[2] || 'seed-data/ingest-tasks.json';
  const tasks: IngestTask[] = JSON.parse(readFileSync(file, 'utf8'));
  for (const task of tasks) {
    try {
      const result = await ingestOne(task);
      if (result.ok) {
        console.log(`OK ${task.url} -> ${result.slug} (${result.chunks} chunks)`);
      } else {
        console.warn(`SKIP ${task.url}: ${result.reason}`);
      }
    } catch (e) {
      console.error(`FAIL ${task.url}:`, (e as Error).message);
    }
  }
}

main();
