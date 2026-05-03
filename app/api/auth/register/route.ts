import { NextResponse } from "next/server";
import { registerUser } from "@/src/services/authService";
import { errorResponse, ApiError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.email || !body.password) {
      throw new ApiError("Email and password are required", 400);
    }
    const result = await registerUser(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
