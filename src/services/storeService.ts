import { Prisma } from "@prisma/client";
import { prisma } from "../models/prisma";
import { AppError } from "../utils/appError";

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
  return prisma.store.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function upsertStore(userId: string, input: StoreInput) {
  let url: string;
  try {
    url = normalizeStoreUrl(input.url);
  } catch {
    throw new AppError("Invalid store URL", 400);
  }

  const name = input.name?.trim() || fallbackStoreName(url);

  const store = await prisma.store.upsert({
    where: { userId_url: { userId, url } },
    create: {
      userId,
      url,
      name,
      platform: input.platform,
      description: input.description,
      analysis: input.analysis,
    },
    update: {
      name,
      platform: input.platform,
      description: input.description,
      analysis: input.analysis,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      activeStoreId: store.id,
      storeName: store.name,
      storeUrl: store.url,
      niche: input.niche,
      onboardingCompleted: true,
    },
  });

  return store;
}

export async function selectStore(userId: string, storeId: string) {
  const store = await prisma.store.findFirst({
    where: { id: storeId, userId },
  });
  if (!store) throw new AppError("Store not found", 404);

  await prisma.user.update({
    where: { id: userId },
    data: {
      activeStoreId: store.id,
      storeName: store.name,
      storeUrl: store.url,
    },
  });

  return store;
}
