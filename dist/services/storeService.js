"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStores = listStores;
exports.upsertStore = upsertStore;
exports.selectStore = selectStore;
const appError_1 = require("../utils/appError");
const storeRepository_1 = require("../repositories/storeRepository");
const userRepository_1 = require("../repositories/userRepository");
function normalizeStoreUrl(rawUrl) {
    const withProtocol = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
        ? rawUrl
        : `https://${rawUrl}`;
    const parsed = new URL(withProtocol);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "");
}
function fallbackStoreName(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    }
    catch {
        return url;
    }
}
async function listStores(userId) {
    return storeRepository_1.StoreRepository.findByUserId(userId);
}
async function upsertStore(userId, input) {
    let url;
    try {
        url = normalizeStoreUrl(input.url);
    }
    catch {
        throw new appError_1.AppError("Invalid store URL", 400);
    }
    const name = input.name?.trim() || fallbackStoreName(url);
    const store = await storeRepository_1.StoreRepository.upsert(userId, url, { name, platform: input.platform, description: input.description, analysis: input.analysis }, { name, platform: input.platform, description: input.description, analysis: input.analysis });
    await userRepository_1.UserRepository.updateActiveStore(userId, {
        activeStoreId: store.id,
        storeName: store.name,
        storeUrl: store.url,
        niche: input.niche,
        onboardingCompleted: true,
    });
    return store;
}
async function selectStore(userId, storeId) {
    const store = await storeRepository_1.StoreRepository.findByIdAndUser(storeId, userId);
    if (!store)
        throw new appError_1.AppError("Store not found", 404);
    await userRepository_1.UserRepository.updateActiveStore(userId, {
        activeStoreId: store.id,
        storeName: store.name,
        storeUrl: store.url,
    });
    return store;
}
