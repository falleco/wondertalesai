import { env } from "@web/env";
import Redis from "ioredis";

export const redis = new Redis(env.REDIS_URL);
