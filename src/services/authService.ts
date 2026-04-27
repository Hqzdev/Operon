import { prisma } from "../models/prisma";
import { AppError } from "../utils/appError";
import { comparePassword, hashPassword } from "../utils/password";
import { signToken } from "../utils/jwt";

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

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      storeName: user.storeName,
      plan: user.plan,
      createdAt: user.createdAt,
    },
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

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      storeName: user.storeName,
      plan: user.plan,
      createdAt: user.createdAt,
    },
  };
}
