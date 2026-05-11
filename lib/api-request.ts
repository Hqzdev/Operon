import { ApiError } from "@/lib/api-auth";

export async function readJsonWithLimit<T>(request: Request, maxBytes = 100_000): Promise<T> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) {
    throw new ApiError("Request body is too large", 413);
  }

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new ApiError("Request body is too large", 413);
  }

  try {
    return JSON.parse(text || "{}") as T;
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }
}
