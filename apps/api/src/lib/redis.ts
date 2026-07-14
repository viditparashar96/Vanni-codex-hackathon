/**
 * Redis connection singleton (ioredis) for BullMQ + pub/sub. When neither
 * REDIS_URL nor REDIS_HOST is set, Redis-dependent features degrade gracefully.
 */

import { Redis, type RedisOptions } from "ioredis";

export function isRedisEnabled(): boolean {
  return !!(process.env.REDIS_URL || process.env.REDIS_HOST);
}

function baseOptions(): RedisOptions {
  return {
    maxRetriesPerRequest: null, // BullMQ requirement
    enableReadyCheck: false,
    retryStrategy(times: number) {
      return Math.min(times * 200, 5000);
    },
  };
}

function parseRedisOptions(): RedisOptions {
  if (process.env.REDIS_HOST) {
    return {
      ...baseOptions(),
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD || undefined,
      username: process.env.REDIS_USERNAME || undefined,
      tls: process.env.REDIS_TLS === "true" ? {} : undefined,
    };
  }

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL or REDIS_HOST is required");

  const parsed = new URL(url);
  const decode = (v: string) => {
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };

  return {
    ...baseOptions(),
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password ? decode(parsed.password) : undefined,
    username: parsed.username ? decode(parsed.username) : undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
  };
}

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(parseRedisOptions());
    _redis.on("error", (err) => console.error("[redis] error:", err.message));
    _redis.on("connect", () => console.log("[redis] connected"));
  }
  return _redis;
}

export function getRedisOptions(): RedisOptions {
  return parseRedisOptions();
}

export async function pingRedis(): Promise<boolean> {
  if (!isRedisEnabled()) return false;
  try {
    return (await getRedis().ping()) === "PONG";
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (!_redis) return;
  const conn = _redis;
  _redis = null;
  await conn.quit().catch(() => conn.disconnect());
  console.log("[redis] closed");
}
