import fs from "node:fs";
import path from "node:path";

export interface UserCredentials {
  apiKey: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  name: string;
  email: string;
  createdAt: string;
  lastUsed: string;
}

function getUsersDir(basePath: string): string {
  return path.join(basePath, "users");
}

function getUserFilePath(basePath: string, apiKey: string): string {
  return path.join(getUsersDir(basePath), `${apiKey}.json`);
}

function ensureUsersDir(basePath: string): void {
  const dir = getUsersDir(basePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function saveUser(basePath: string, user: UserCredentials): void {
  ensureUsersDir(basePath);
  fs.writeFileSync(
    getUserFilePath(basePath, user.apiKey),
    JSON.stringify(user, null, 2),
  );
}

export function loadUser(
  basePath: string,
  apiKey: string,
): UserCredentials | null {
  const filePath = getUserFilePath(basePath, apiKey);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as UserCredentials;
  } catch {
    return null;
  }
}

export function updateUser(basePath: string, user: UserCredentials): void {
  saveUser(basePath, user);
}

export function countUsers(basePath: string): number {
  const dir = getUsersDir(basePath);
  if (!fs.existsSync(dir)) return 0;
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).length;
  } catch {
    return 0;
  }
}
