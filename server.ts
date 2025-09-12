import app from "@/app";
import config from "@/config/config";
import { connectPrisma } from "@/database/prisma";
import { connectRedis } from "@/config/redisConfig";
import logger from "@/utils/debug/logger";

(async () => {
  await connectPrisma();
  await connectRedis();

  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
  });
})();
