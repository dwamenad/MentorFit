import 'dotenv/config';

import { randomBytes } from 'node:crypto';
import path from 'node:path';

import express from 'express';
import { createServer as createViteServer } from 'vite';

import { discoverAcademicProfessors } from './server/discovery';
import { buildAuthUser, createLoginSession, destroyLoginSession, getAppUrl, getAuthConfig, getCurrentUser, getGoogleState, hashPassword, isStrongEnoughPassword, setGoogleState, clearGoogleState, verifyPassword } from './server/services/auth';
import { createCheckoutSession, constructWebhookEvent, handleWebhookEvent, readCheckoutSession } from './server/services/billing';
import { fetchSourcePreview } from './server/services/faculty-page';
import { buildGoogleAuthUrl, exchangeGoogleCode, isGoogleOAuthConfigured } from './server/services/google-oauth';
import { createPasswordUser, getWorkspace, saveWorkspace, type StoredUser, upsertGoogleUser, findUserByEmail } from './server/services/store';
import { buildProfessorProfile, computeMatch } from './src/lib/mentor-engine';
import { normalizeWorkspaceState } from './src/lib/workspace';
import type { AuthConfig, AuthUser, Professor, StudentProfile, WorkspaceState } from './src/types';

type SessionResponse = {
  user: AuthUser | null;
  workspace: WorkspaceState | null;
  authConfig: AuthConfig;
  error?: string;
};

function isStudentProfile(value: unknown): value is StudentProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as StudentProfile;
  return Boolean(candidate.id && candidate.name && candidate.field && candidate.researchInterests && candidate.preferences);
}

function isProfessorArray(value: unknown): value is Professor[] {
  return Array.isArray(value);
}

function normalizeWorkspaceInput(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<WorkspaceState>;

  return normalizeWorkspaceState({
    studentProfile: isStudentProfile(candidate.studentProfile) ? candidate.studentProfile : null,
    professors: isProfessorArray(candidate.professors) ? candidate.professors : [],
    matches: Array.isArray(candidate.matches) ? candidate.matches : [],
    discoveryMeta: candidate.discoveryMeta ?? null,
    shortlistIds: Array.isArray(candidate.shortlistIds) ? candidate.shortlistIds.filter((id): id is string => typeof id === 'string') : [],
    comparisonIds: Array.isArray(candidate.comparisonIds) ? candidate.comparisonIds.filter((id): id is string => typeof id === 'string') : [],
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : undefined,
  });
}

async function buildSessionResponse(user: StoredUser | null): Promise<SessionResponse> {
  const authConfig = getAuthConfig();

  if (!user) {
    return {
      user: null,
      workspace: null,
      authConfig,
    };
  }

  const workspace = await getWorkspace(user.id);

  return {
    user: buildAuthUser(user, workspace),
    workspace,
    authConfig,
  };
}

function buildRedirectUrl(params: Record<string, string>) {
  const url = new URL(getAppUrl());

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

async function requireUser(req: express.Request, res: express.Response) {
  const user = await getCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: 'Sign in to access this feature.' });
    return null;
  }

  return user;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'];
      const event = constructWebhookEvent(req.body as Buffer, typeof signature === 'string' ? signature : undefined);
      await handleWebhookEvent(event);
      res.json({ received: true });
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : 'Invalid webhook payload.');
    }
  });

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/auth/me', async (req, res) => {
    const user = await getCurrentUser(req);
    res.json(await buildSessionResponse(user));
  });

  app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password } = req.body ?? {};

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'A display name is required.' });
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }

    if (typeof password !== 'string' || !isStrongEnoughPassword(password)) {
      return res.status(400).json({ error: 'Passwords must be at least 8 characters.' });
    }

    try {
      const passwordHash = await hashPassword(password);
      const user = await createPasswordUser({
        name,
        email,
        passwordHash,
      });

      await createLoginSession(res, user.id);
      res.status(201).json(await buildSessionResponse(user));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create that account.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'No account matched that email.' });
    }

    if (!user.passwordHash) {
      return res.status(400).json({ error: 'This account uses Google sign-in. Continue with Google instead.' });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    await createLoginSession(res, user.id);
    res.json(await buildSessionResponse(user));
  });

  app.post('/api/auth/logout', async (req, res) => {
    await destroyLoginSession(req, res);
    res.json({ ok: true, authConfig: getAuthConfig() });
  });

  app.get('/auth/google/start', (_req, res) => {
    if (!isGoogleOAuthConfigured()) {
      return res.redirect(buildRedirectUrl({ auth: 'google-unavailable' }));
    }

    const state = randomBytes(24).toString('hex');
    setGoogleState(res, state);
    res.redirect(buildGoogleAuthUrl(state));
  });

  app.get('/auth/google/callback', async (req, res) => {
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const expectedState = getGoogleState(req);

    if (!state || !code || !expectedState || state !== expectedState) {
      clearGoogleState(res);
      return res.redirect(buildRedirectUrl({ auth: 'google-failed' }));
    }

    try {
      const profile = await exchangeGoogleCode(code);
      const user = await upsertGoogleUser(profile);
      clearGoogleState(res);
      await createLoginSession(res, user.id);
      res.redirect(buildRedirectUrl({ auth: 'google-success' }));
    } catch {
      clearGoogleState(res);
      res.redirect(buildRedirectUrl({ auth: 'google-failed' }));
    }
  });

  app.get('/api/workspace', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) {
      return;
    }

    const workspace = await getWorkspace(user.id);
    res.json({ workspace });
  });

  app.put('/api/workspace', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) {
      return;
    }

    const workspace = normalizeWorkspaceInput(req.body?.workspace);
    if (!workspace) {
      return res.status(400).json({ error: 'A valid workspace payload is required.' });
    }

    const savedWorkspace = await saveWorkspace(user.id, workspace);
    if (!savedWorkspace) {
      return res.status(404).json({ error: 'Account workspace could not be found.' });
    }

    res.json({
      workspace: savedWorkspace,
      user: buildAuthUser(user, savedWorkspace),
    });
  });

  app.post('/api/billing/create-checkout-session', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) {
      return;
    }

    try {
      const session = await createCheckoutSession(user);
      res.json({ url: session.url });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start Stripe checkout.';
      res.status(400).json({ error: message });
    }
  });

  app.get('/api/billing/checkout-status', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) {
      return;
    }

    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : '';
    if (!sessionId) {
      return res.status(400).json({ error: 'A checkout session id is required.' });
    }

    try {
      const status = await readCheckoutSession(sessionId);
      res.json(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to read the checkout session.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/discover-researchers', async (req, res) => {
    const { studentProfile } = req.body ?? {};

    if (!isStudentProfile(studentProfile)) {
      return res.status(400).json({ error: 'A valid student profile is required before discovering researchers.' });
    }

    try {
      const { professors, discoveryMeta } = await discoverAcademicProfessors(studentProfile);
      res.json({ professors, discoveryMeta });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to build the academic discovery dataset.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ingest-profile', async (req, res) => {
    const { url, studentProfile } = req.body ?? {};

    if (typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'A public profile URL is required.' });
    }

    if (!isStudentProfile(studentProfile)) {
      return res.status(400).json({ error: 'A valid student profile is required before ingesting mentors.' });
    }

    try {
      const parsedUrl = new URL(url);
      if (!/^https?:$/.test(parsedUrl.protocol)) {
        return res.status(400).json({ error: 'Only http and https URLs are supported.' });
      }

      const preview = await fetchSourcePreview(parsedUrl.toString());
      const professor = buildProfessorProfile(parsedUrl.toString(), preview, studentProfile);
      const match = computeMatch(studentProfile, professor, preview);

      res.json({ professor, match, preview });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to process this URL.';
      res.status(400).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
