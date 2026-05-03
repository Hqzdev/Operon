export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!configuredUrl) {
    return "/api";
  }

  try {
    const url = new URL(configuredUrl);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return "/api";
    }
  } catch {
    return configuredUrl;
  }

  return configuredUrl.replace(/\/$/, "");
}
