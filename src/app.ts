import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { apiRoutes } from "./routes";
import { healthRoutes } from "./routes/healthRoutes";
import { startScheduler } from "./services/schedulerService";
import { env } from "./utils/env";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: [env.NEXT_PUBLIC_APP_URL, "http://localhost:3000"],
      credentials: false,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp());
  app.use(apiRateLimiter);

  app.use("/health", healthRoutes);

  app.use("/api", apiRoutes);
  app.use(notFound);
  app.use(errorHandler);

  startScheduler();

  return app;
}
