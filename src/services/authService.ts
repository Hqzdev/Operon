import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../models/prisma";
import { AppError } from "../utils/appError";
import { env } from "../utils/env";
import { comparePassword, hashPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { getUserProfile } from "./userService";

export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
  storeName?: string;
}) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new AppError("A user with this email already exists", 409);
  }

  const password = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password,
      name: input.name,
      storeName: input.storeName,
    },
  });

  const token = signToken({
    userId: user.id,
    email: user.email,
  });

  const profile = await getUserProfile(user.id);

  return {
    token,
    user: profile,
  };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const passwordValid = await comparePassword(input.password, user.password);
  if (!passwordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
  });

  const profile = await getUserProfile(user.id);

  return {
    token,
    user: profile,
  };
}

type GoogleOAuthState = {
  provider: "google";
  redirectUri: string;
  nonce: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function assertGoogleOAuthConfigured() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new AppError("Google OAuth is not configured", 503);
  }
}

export function buildGoogleOAuthUrl(redirectUri: string) {
  assertGoogleOAuthConfigured();

  const state = jwt.sign(
    {
      provider: "google",
      redirectUri,
      nonce: crypto.randomUUID(),
    } satisfies GoogleOAuthState,
    env.JWT_SECRET,
    { expiresIn: "10m" },
  );

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return url.toString();
}

function verifyGoogleState(state: string, redirectUri: string) {
  const payload = jwt.verify(state, env.JWT_SECRET) as GoogleOAuthState;
  if (payload.provider !== "google" || payload.redirectUri !== redirectUri) {
    throw new AppError("Google OAuth state mismatch", 400);
  }
}

async function exchangeGoogleCode(code: string, redirectUri: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const token = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !token.access_token) {
    throw new AppError(token.error_description ?? token.error ?? "Google token exchange failed", 400);
  }

  return token.access_token;
}

async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const profile = (await response.json()) as GoogleUserInfo;
  if (!response.ok || !profile.email) {
    throw new AppError("Unable to read Google profile", 400);
  }

  if (!profile.email_verified) {
    throw new AppError("Google email is not verified", 400);
  }

  return {
    email: profile.email.toLowerCase(),
    name: profile.name,
    avatarUrl: profile.picture,
  };
}

export async function completeGoogleOAuth(input: { code: string; state: string; redirectUri: string }) {
  assertGoogleOAuthConfigured();
  verifyGoogleState(input.state, input.redirectUri);

  const accessToken = await exchangeGoogleCode(input.code, input.redirectUri);
  const googleUser = await fetchGoogleUserInfo(accessToken);

  const user = await prisma.user.upsert({
    where: { email: googleUser.email },
    update: {
      name: googleUser.name,
      avatarUrl: googleUser.avatarUrl,
    },
    create: {
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.avatarUrl,
      password: await hashPassword(`google-oauth:${crypto.randomBytes(32).toString("hex")}`),
    },
  });

  const token = signToken({
    userId: user.id,
    email: user.email,
  });

  const profile = await getUserProfile(user.id);

  return {
    token,
    user: profile,
  };
}
