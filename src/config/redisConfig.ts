import { createClient } from "redis";
import logger from "@/utils/debug/logger";

export const client = createClient({
  url: "redis://127.0.0.1:6379",
});

client.on("error", (err) => logger.error("Redis connection error:", err));
client.on("connect", () => logger.info("Redis Client Connected"));
client.on("ready", () => logger.info("Redis Client Ready"));

export const connectRedis = async () => {
  if (!client.isOpen) {
    await client.connect();
  }
};

export const redisGet = async (key: string): Promise<string | null> => {
  return client.get(key);
};

export const redisSet = async (key: string, value: string): Promise<void> => {
  await client.set(key, value);
};

export const redisSetEx = async (
  key: string,
  seconds: number,
  value: string
): Promise<void> => {
  await client.setEx(key, seconds, value);
};

export const redisDel = async (key: string): Promise<void> => {
  await client.del(key);
};

export const redisExpire = async (
  key: string,
  seconds: number
): Promise<void> => {
  await client.expire(key, seconds);
};
