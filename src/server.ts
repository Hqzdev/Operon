import { createApp } from "./app";
import { prisma } from "./models/prisma";
import { env } from "./utils/env";

async function bootstrap() {
  await prisma.$connect();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
