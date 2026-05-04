"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const prisma_1 = require("./models/prisma");
const integrationService_1 = require("./services/integrationService");
const env_1 = require("./utils/env");
async function bootstrap() {
    await prisma_1.prisma.$connect();
    const app = (0, app_1.createApp)();
    app.listen(env_1.env.PORT, () => {
        console.log(`Backend listening on http://localhost:${env_1.env.PORT}`);
    });
    setInterval(() => {
        (0, integrationService_1.syncDueConnections)().catch((error) => {
            console.error("Integration sync failed", error);
        });
    }, 60 * 60 * 1000);
}
bootstrap().catch((error) => {
    console.error("Failed to start backend", error);
    process.exit(1);
});
