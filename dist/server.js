"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const prisma_1 = require("./models/prisma");
const env_1 = require("./utils/env");
async function bootstrap() {
    await prisma_1.prisma.$connect();
    const app = (0, app_1.createApp)();
    app.listen(env_1.env.PORT, () => {
        console.log(`Backend listening on http://localhost:${env_1.env.PORT}`);
    });
}
bootstrap().catch((error) => {
    console.error("Failed to start backend", error);
    process.exit(1);
});
