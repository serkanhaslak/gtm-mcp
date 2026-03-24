import type { OAuthClient, AuthorizationCode, TokenData } from "./types.js";

// In-memory storage
const clients = new Map<string, OAuthClient>();
const authCodes = new Map<string, AuthorizationCode>();
const accessTokens = new Map<string, TokenData>();
const refreshTokens = new Map<string, TokenData>();

// --- Client Registration ---

export function registerClient(metadata: {
  client_name?: string;
  redirect_uris: string[];
  client_uri?: string;
  policy_uri?: string;
  tos_uri?: string;
  contacts?: string[];
}): OAuthClient {
  const clientId = crypto.randomUUID();
  const clientSecret = crypto.randomUUID();

  const client: OAuthClient = {
    clientId,
    clientSecret,
    clientName: metadata.client_name,
    redirectUris: metadata.redirect_uris,
    clientUri: metadata.client_uri,
    policyUri: metadata.policy_uri,
    tosUri: metadata.tos_uri,
    contacts: metadata.contacts,
    registeredAt: Date.now(),
  };

  clients.set(clientId, client);
  return client;
}

export function lookupClient(clientId: string): OAuthClient | null {
  return clients.get(clientId) ?? null;
}

export function deleteClient(clientId: string): void {
  clients.delete(clientId);
}

// --- Authorization Codes ---

export function storeAuthCode(data: AuthorizationCode): void {
  authCodes.set(data.code, data);
}

export function consumeAuthCode(code: string): AuthorizationCode | null {
  const data = authCodes.get(code);
  if (!data) return null;
  authCodes.delete(code); // one-time use
  if (Date.now() > data.expiresAt) return null; // expired
  return data;
}

// --- Access Tokens ---

export function storeAccessToken(data: TokenData): void {
  accessTokens.set(data.token, data);
}

export function lookupAccessToken(token: string): TokenData | null {
  const data = accessTokens.get(token);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    accessTokens.delete(token);
    return null;
  }
  return data;
}

export function revokeAccessToken(token: string): void {
  accessTokens.delete(token);
}

// --- Refresh Tokens ---

export function storeRefreshToken(data: TokenData): void {
  refreshTokens.set(data.token, data);
}

export function lookupRefreshToken(token: string): TokenData | null {
  return refreshTokens.get(token) ?? null;
}

export function revokeRefreshToken(token: string): void {
  refreshTokens.delete(token);
}

// --- Grant Management (for /remove endpoint) ---

export function listUserGrants(userId: string): {
  accessTokenKeys: string[];
  refreshTokenKeys: string[];
  clientIds: string[];
} {
  const result = {
    accessTokenKeys: [] as string[],
    refreshTokenKeys: [] as string[],
    clientIds: new Set<string>(),
  };

  for (const [key, data] of accessTokens) {
    if (data.userId === userId) {
      result.accessTokenKeys.push(key);
      result.clientIds.add(data.clientId);
    }
  }

  for (const [key, data] of refreshTokens) {
    if (data.userId === userId) {
      result.refreshTokenKeys.push(key);
      result.clientIds.add(data.clientId);
    }
  }

  return {
    ...result,
    clientIds: Array.from(result.clientIds),
  };
}

export function revokeUserGrants(userId: string): void {
  const grants = listUserGrants(userId);
  for (const key of grants.accessTokenKeys) accessTokens.delete(key);
  for (const key of grants.refreshTokenKeys) refreshTokens.delete(key);
}

// --- Cleanup expired entries ---

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, data] of authCodes) {
    if (now > data.expiresAt) authCodes.delete(key);
  }
  for (const [key, data] of accessTokens) {
    if (now > data.expiresAt) accessTokens.delete(key);
  }
}

// Run cleanup every 10 minutes
const storeCleanup = setInterval(cleanupExpired, 10 * 60 * 1000);
storeCleanup.unref();
