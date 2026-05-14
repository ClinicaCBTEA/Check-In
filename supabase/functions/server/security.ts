import * as kv from "./kv_store.ts";

export type AuthRole = "admin" | "receptionist";

export interface SessionRecord {
  token: string;
  role: AuthRole;
  userId: string;
  username: string;
  name?: string;
  unitIds?: string[];
  createdAt: string;
  expiresAt: string;
}

const PASSWORD_ITERATIONS = 150000;
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const textEncoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(value: string): Uint8Array {
  const normalized = value.trim();
  if (normalized.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = parseInt(normalized.slice(index, index + 2), 16);
  }

  return bytes;
}

function randomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return toHex(array.buffer);
}

export async function hashPassword(
  password: string,
  salt = randomHex(16),
): Promise<{ hash: string; salt: string }> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: fromHex(salt),
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  return {
    hash: toHex(bits),
    salt,
  };
}

export async function verifyPassword(
  password: string,
  passwordHash?: string,
  passwordSalt?: string,
): Promise<boolean> {
  if (!passwordHash || !passwordSalt) {
    return false;
  }

  const derived = await hashPassword(password, passwordSalt);
  return derived.hash === passwordHash;
}

export function buildPasswordRecord(password: string) {
  return hashPassword(password);
}

export async function createSession(
  payload: Omit<SessionRecord, "token" | "createdAt" | "expiresAt">,
): Promise<SessionRecord> {
  const token = randomHex(32);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const session: SessionRecord = {
    token,
    createdAt,
    expiresAt,
    ...payload,
  };

  await kv.set(`session:${token}`, session);
  return session;
}

export async function getSession(token: string): Promise<SessionRecord | null> {
  const session = await kv.get(`session:${token}`);
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await kv.del(`session:${token}`);
    return null;
  }

  return session as SessionRecord;
}

export async function deleteSession(token: string): Promise<void> {
  await kv.del(`session:${token}`);
}
