import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Redis is optional - only initialize if credentials are provided
let redis: Redis | null = null;
let lockerRedisClient: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

if (process.env.UPSTASH_REDIS_REST_LOCKER_URL && process.env.UPSTASH_REDIS_REST_LOCKER_TOKEN) {
  lockerRedisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_LOCKER_URL,
    token: process.env.UPSTASH_REDIS_REST_LOCKER_TOKEN,
  });
}

export { redis, lockerRedisClient };

// Create a new ratelimiter, that allows 10 requests per 10 seconds by default
export const ratelimit = (
  requests: number = 10,
  seconds:
    | `${number} ms`
    | `${number} s`
    | `${number} m`
    | `${number} h`
    | `${number} d` = "10 s",
) => {
  if (!redis) {
    // Return a no-op ratelimiter if Redis is not configured
    return {
      limit: async () => ({ success: true, limit: requests, remaining: requests, reset: Date.now() }),
    };
  }
  
  return new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(requests, seconds),
    analytics: true,
    prefix: "papermark",
  });
};
