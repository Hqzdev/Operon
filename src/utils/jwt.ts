import jwt from "jsonwebtoken";
import { env } from "./env";

export type AuthTokenPayload = {
  userId: string;
  email: string;
};

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
