import { account, ID } from "@/lib/appwrite";

export async function registerUser({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  await account.create({
    userId: ID.unique(),
    email,
    password,
    name,
  });

  return loginUser({ email, password });
}

export async function loginUser({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  await account.createEmailPasswordSession({
    email,
    password,
  });

  return account.get();
}

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function logoutUser() {
  await account.deleteSession({
    sessionId: "current",
  });
}