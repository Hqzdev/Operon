import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/src/utils/appError";

export class ApiError extends AppError {}

export { AppError };

export function getAuthUserId(request: Request): string {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError("Authentication token is required", 401);
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
    };
    return payload.userId;
  } catch {
    throw new ApiError("Invalid or expired authentication token", 401);
  }
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { message: error.message, ...(error.details ? { details: error.details } : {}) },
      { status: error.statusCode },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ message: "Validation error", details: error.errors }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ message }, { status: 500 });
}
