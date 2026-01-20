import { Request, Response, NextFunction } from "express";
import redisClient from "../config/redis";

const cache =
  (keyPrefix: string, ttl = 300) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyPrefix}:${req.originalUrl}`;
    const timestamp = new Date().toISOString();
    const startTime = Date.now();

    console.log(`[${timestamp}] Checking cache for key: ${key}`);

    const cached = await redisClient.get(key);
    if (cached) {
      const responseTime = Date.now() - startTime;
      console.log(`[${timestamp}] CACHE HIT! Response time: ${responseTime}ms - Returning data from Redis for key: ${key}`);
      return res.json(JSON.parse(cached));
    }

    console.log(`[${timestamp}] CACHE MISS! Querying database for key: ${key}`);

    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      const responseTime = Date.now() - startTime;
      redisClient.setEx(key, ttl, JSON.stringify(body));
      console.log(`[${timestamp}] DB QUERY COMPLETE! Response time: ${responseTime}ms - Cached data in Redis for ${ttl} seconds with key: ${key}`);
      console.log(`[${timestamp}] Cached ${Array.isArray(body) ? body.length : 1} item(s)`);
      return originalJson(body);
    };

    next();
  };

export default cache;
