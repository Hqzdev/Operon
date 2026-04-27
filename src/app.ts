import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { apiRoutes } from "./routes";
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

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use("/api", apiRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
