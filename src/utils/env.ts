import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  PORT: z.coerce.number().default(4000),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_API_BASE_URL: z.string().default("http://localhost:4000/api"),
  YOOKASSA_SHOP_ID: z.string().optional(),
  YOOKASSA_SECRET_KEY: z.string().optional(),
  YOOKASSA_RETURN_URL: z.string().default("http://localhost:3000/dashboard"),
  YOOKASSA_WEBHOOK_SECRET: z.string().optional(),
  GIGACHAT_AUTH_KEY: z.string().optional(),
  GIGACHAT_SCOPE: z.string().default("GIGACHAT_API_PERS"),
  GIGACHAT_MODEL: z.string().default("GigaChat-2-Pro"),
  GIGACHAT_BASE_URL: z.string().default("https://gigachat.devices.sberbank.ru/api/v1"),
  GIGACHAT_OAUTH_URL: z.string().default("https://ngw.devices.sberbank.ru:9443/api/v2/oauth"),
});

type Env = z.infer<typeof envSchema>;

let _parsed: Env | null = null;

function getParsedEnv(): Env {
  if (!_parsed) {
    _parsed = envSchema.parse(process.env);
  }
  return _parsed;
}

export const env = new Proxy({} as Env, {
  get(_, key: string) {
    return getParsedEnv()[key as keyof Env];
  },
});
