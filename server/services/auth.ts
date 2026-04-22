import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import type { Request, Response } from 'express';

import type { AuthConfig, AuthUser, WorkspaceState } from '../../src/types';
import { createSession, deleteSession, findUserBySessionToken, type StoredUser } from './store';

const scrypt = promisify(nodeScrypt);

const SESSION_COOKIE_NAME = 'mentorfit_session';
const GOOGLE_STATE_COOKIE_NAME = 'mentorfit_google_state';
const COOKIE_TTL_SECONDS = 30 * 24 * 60 * 60;

function isSecureCookie() {
  return process.env.NODE_ENV === 'production' || process.env.APP_URL?.startsWith('https://');
}

function serializeCookie(name: string, value: string, options?: { maxAge?: number; httpOnly?: boolean }) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax'];

  if (options?.httpOnly ?? true) {
    parts.push('HttpOnly');
  }

  if (typeof options?.maxAge === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  if (isSecureCookie()) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function parseCookieHeader(header: string | undefined) {
  if (!header) {
    return new Map<string, string>();
  }

  return new Map(
    header
      .split(';')
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => {
        const separatorIndex = segment.indexOf('=');
        if (separatorIndex === -1) {
          return [segment, ''] as const;
        }

        const key = segment.slice(0, separatorIndex).trim();
        const value = segment.slice(separatorIndex + 1).trim();
        return [key, decodeURIComponent(value)] as const;
      }),
  );
}

function inferProvider(user: StoredUser): AuthUser['provider'] {
  if (user.passwordHash && user.googleSubject) {
    return 'hybrid';
  }

  return user.googleSubject ? 'google' : 'password';
}

export function getAppUrl() {
  return process.env.APP_URL?.trim() || 'http://localhost:3000';
}

export function getAuthConfig(): AuthConfig {
  return {
    googleOAuthEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    stripeBillingEnabled: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID && process.env.STRIPE_WEBHOOK_SECRET),
    proPriceLabel: process.env.STRIPE_PRO_PRICE_LABEL?.trim() || '$19 / month',
  };
}

export function getSessionToken(req: Request) {
  return parseCookieHeader(req.headers.cookie).get(SESSION_COOKIE_NAME) ?? null;
}

export function getGoogleState(req: Request) {
  return parseCookieHeader(req.headers.cookie).get(GOOGLE_STATE_COOKIE_NAME) ?? null;
}

export function clearGoogleState(res: Response) {
  res.append('set-cookie', serializeCookie(GOOGLE_STATE_COOKIE_NAME, '', { maxAge: 0 }));
}

export function setGoogleState(res: Response, state: string) {
  res.append('set-cookie', serializeCookie(GOOGLE_STATE_COOKIE_NAME, state, { maxAge: 15 * 60 }));
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) {
    return false;
  }

  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const stored = Buffer.from(hash, 'hex');

  if (stored.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(stored, derived);
}

export function isStrongEnoughPassword(password: string) {
  return password.trim().length >= 8;
}

export function buildAuthUser(user: StoredUser, workspace: WorkspaceState | null): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: inferProvider(user),
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    shortlistCount: workspace?.shortlistIds.length ?? 0,
    comparisonCount: workspace?.comparisonIds.length ?? 0,
  };
}

export async function createLoginSession(res: Response, userId: string) {
  const token = await createSession(userId);
  res.append('set-cookie', serializeCookie(SESSION_COOKIE_NAME, token, { maxAge: COOKIE_TTL_SECONDS }));
}

export async function destroyLoginSession(req: Request, res: Response) {
  const token = getSessionToken(req);
  if (token) {
    await deleteSession(token);
  }

  res.append('set-cookie', serializeCookie(SESSION_COOKIE_NAME, '', { maxAge: 0 }));
}

export async function getCurrentUser(req: Request) {
  const token = getSessionToken(req);
  if (!token) {
    return null;
  }

  return findUserBySessionToken(token);
}
