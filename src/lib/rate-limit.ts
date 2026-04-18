import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const chatGuestLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'betyget:chat:guest',
  analytics: true,
});

export const chatUserLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 h'),
  prefix: 'betyget:chat:user',
  analytics: true,
});

export const goIpLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'betyget:go',
  analytics: true,
});

export function rateLimitResponse(reset: number): Response {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return new Response('Too many requests', {
    status: 429,
    headers: { 'retry-after': String(retryAfter) },
  });
}
