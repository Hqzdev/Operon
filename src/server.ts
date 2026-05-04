import { createApp } from "./app";
import { prisma } from "./models/prisma";
import { syncDueConnections } from "./services/integrationService";
import { env } from "./utils/env";

async function bootstrap() {
  await prisma.$connect();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`);
  });

  setInterval(() => {
    syncDueConnections().catch((error) => {
      console.error("Integration sync failed", error);
    });
  }, 60 * 60 * 1000);
}

bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
