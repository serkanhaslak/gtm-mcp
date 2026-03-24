import type { Props } from "../utils/authorizeUtils.js";

export interface AuthRequest {
  clientId: string;
  scope: string;
  redirectUri: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

export interface ClientInfo {
  clientId: string;
  clientName?: string;
  clientUri?: string;
  redirectUris: string[];
  policyUri?: string;
  tosUri?: string;
  contacts?: string[];
}

export interface OAuthClient extends ClientInfo {
  clientSecret: string;
  registeredAt: number;
}

export interface AuthorizationCode {
  code: string;
  clientId: string;
  userId: string;
  scope: string;
  redirectUri: string;
  props: Props;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: number;
}

export interface TokenData {
  token: string;
  clientId: string;
  userId: string;
  props: Props;
  scope: string;
  expiresAt: number;
}
