import { Prisma } from "@prisma/client";
import { AppError } from "../utils/appError";
import { StoreRepository } from "../repositories/storeRepository";
import { UserRepository } from "../repositories/userRepository";

type StoreInput = {
  name?: string;
  url: string;
  platform?: string;
  description?: string;
  niche?: string;
  analysis?: Prisma.InputJsonValue;
};

function normalizeStoreUrl(rawUrl: string) {
  const withProtocol = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? rawUrl
    : `https://${rawUrl}`;
  const parsed = new URL(withProtocol);
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "");
}

function fallbackStoreName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function listStores(userId: string) {
  return StoreRepository.findByUserId(userId);
}

export async function upsertStore(userId: string, input: StoreInput) {
  let url: string;
  try {
    url = normalizeStoreUrl(input.url);
  } catch {
    throw new AppError("Invalid store URL", 400);
  }

  const name = input.name?.trim() || fallbackStoreName(url);

  const store = await StoreRepository.upsert(
    userId,
    url,
    { name, platform: input.platform, description: input.description, analysis: input.analysis },
    { name, platform: input.platform, description: input.description, analysis: input.analysis },
  );

  await UserRepository.updateActiveStore(userId, {
    activeStoreId: store.id,
    storeName: store.name,
    storeUrl: store.url,
    niche: input.niche,
    onboardingCompleted: true,
  });

  return store;
}

export async function selectStore(userId: string, storeId: string) {
  const store = await StoreRepository.findByIdAndUser(storeId, userId);
  if (!store) throw new AppError("Store not found", 404);

  await UserRepository.updateActiveStore(userId, {
    activeStoreId: store.id,
    storeName: store.name,
    storeUrl: store.url,
  });

  return store;
}
