import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Toaster, toast } from 'sonner';

import { AuthDialog } from './components/AuthDialog';
import { Dashboard } from './components/Dashboard';
import { Landing } from './components/Landing';
import { Onboarding } from './components/Onboarding';
import { PricingDialog } from './components/PricingDialog';
import { Button } from './components/ui/button';
import { normalizePreferredCountries } from './lib/countries';
import { clearStored, readStored, STORAGE_KEYS, writeStored } from './lib/persistence';
import { downloadProfessorReport } from './lib/report';
import { hasDiscoveryPool, mergeDiscoveredProfessors, recomputeMatches, sanitizePersistedProfessors } from './lib/recommendations';
import { buildWorkspaceState, createEmptyWorkspaceState, isWorkspaceEmpty, normalizeWorkspaceState } from './lib/workspace';
import type { AuthConfig, AuthUser, DiscoveryMeta, MatchResult, Professor, StudentProfile, WorkspaceState } from './types';

const DEFAULT_AUTH_CONFIG: AuthConfig = {
  googleOAuthEnabled: false,
  stripeBillingEnabled: false,
  proPriceLabel: '$19 / month',
};

const SHORTLIST_LIMIT = 40;
const COMPARISON_LIMIT = 4;

type DiscoverResponse = {
  professors?: Professor[];
  discoveryMeta?: DiscoveryMeta;
  error?: string;
};

type SessionResponse = {
  user: AuthUser | null;
  workspace: WorkspaceState | null;
  authConfig: AuthConfig;
  error?: string;
};

type CheckoutStatusResponse = {
  status?: string | null;
  paymentStatus?: string | null;
  subscriptionStatus?: string | null;
  error?: string;
};

function normalizeStudentProfile(profile: StudentProfile | null) {
  if (!profile) {
    return null;
  }

  return {
    ...profile,
    preferredCountries: normalizePreferredCountries((profile as Partial<StudentProfile>).preferredCountries),
  };
}

function normalizeIdSelection(ids: string[], professors: Professor[], limit: number, keepMostRecent = false) {
  const professorIds = new Set(professors.map((professor) => professor.id));
  const filtered = [...new Set(ids.filter((id) => professorIds.has(id)))];
  return keepMostRecent ? filtered.slice(-limit) : filtered.slice(0, limit);
}

function ErrorBoundary({ children }: { children: ReactNode }) {
  const [errorState, setErrorState] = useState<{ hasError: boolean; error: unknown }>({ hasError: false, error: null });

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setErrorState({ hasError: true, error: event.error });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (errorState.hasError) {
    const errorMessage = errorState.error instanceof Error ? errorState.error.message : 'Something went wrong.';

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card rounded-xl shadow-xl border border-border p-8 text-center">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Application Error</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">{errorMessage}</p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-primary text-primary-foreground font-bold py-6 rounded-md"
          >
            <RefreshCw className="mr-2 w-4 h-4" /> Reload Application
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  const [initialState] = useState(() => {
    const storedStudentProfile = normalizeStudentProfile(readStored<StudentProfile | null>(STORAGE_KEYS.studentProfile, null));
    const storedProfessors = sanitizePersistedProfessors(readStored<Professor[]>(STORAGE_KEYS.professors, []));
    const storedDiscoveryMeta = readStored<DiscoveryMeta | null>(STORAGE_KEYS.discoveryMeta, null);
    const storedShortlistIds = readStored<string[]>(STORAGE_KEYS.shortlistIds, []);
    const storedComparisonIds = readStored<string[]>(STORAGE_KEYS.comparisonIds, []);
    const storedAuthUser = readStored<AuthUser | null>(STORAGE_KEYS.authUser, null);

    return {
      studentProfile: storedStudentProfile,
      professors: storedProfessors,
      discoveryMeta: storedDiscoveryMeta,
      shortlistIds: normalizeIdSelection(storedShortlistIds, storedProfessors, SHORTLIST_LIMIT),
      comparisonIds: normalizeIdSelection(storedComparisonIds, storedProfessors, COMPARISON_LIMIT, true),
      authUser: storedAuthUser,
    };
  });

  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(initialState.studentProfile);
  const [professors, setProfessors] = useState<Professor[]>(initialState.professors);
  const [matches, setMatches] = useState<MatchResult[]>(() => recomputeMatches(initialState.studentProfile, initialState.professors));
  const [discoveryMeta, setDiscoveryMeta] = useState<DiscoveryMeta | null>(initialState.discoveryMeta);
  const [shortlistIds, setShortlistIds] = useState<string[]>(initialState.shortlistIds);
  const [comparisonIds, setComparisonIds] = useState<string[]>(initialState.comparisonIds);
  const [authUser, setAuthUser] = useState<AuthUser | null>(initialState.authUser);
  const [authConfig, setAuthConfig] = useState<AuthConfig>(DEFAULT_AUTH_CONFIG);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncingWorkspace, setIsSyncingWorkspace] = useState(false);
  const [isDiscoveringRecommendations, setIsDiscoveringRecommendations] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [hasBootstrappedDiscovery, setHasBootstrappedDiscovery] = useState(() => hasDiscoveryPool(initialState.professors));
  const [hasHydratedSession, setHasHydratedSession] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [view, setView] = useState<'landing' | 'onboarding' | 'dashboard'>(() =>
    initialState.studentProfile ? 'dashboard' : 'landing',
  );

  const buildLocalWorkspace = () =>
    buildWorkspaceState({
      studentProfile,
      professors,
      discoveryMeta,
      shortlistIds,
      comparisonIds,
    });

  const applyWorkspace = (workspace: WorkspaceState | null) => {
    const normalizedWorkspace = normalizeWorkspaceState(workspace);
    const nextStudentProfile = normalizeStudentProfile(normalizedWorkspace.studentProfile);
    const nextProfessors = sanitizePersistedProfessors(normalizedWorkspace.professors);
    const nextShortlistIds = normalizeIdSelection(normalizedWorkspace.shortlistIds, nextProfessors, SHORTLIST_LIMIT);
    const nextComparisonIds = normalizeIdSelection(normalizedWorkspace.comparisonIds, nextProfessors, COMPARISON_LIMIT, true);

    setStudentProfile(nextStudentProfile);
    setProfessors(nextProfessors);
    setMatches(recomputeMatches(nextStudentProfile, nextProfessors));
    setDiscoveryMeta(normalizedWorkspace.discoveryMeta ?? null);
    setShortlistIds(nextShortlistIds);
    setComparisonIds(nextComparisonIds);
    setHasBootstrappedDiscovery(hasDiscoveryPool(nextProfessors));
    setView(nextStudentProfile ? 'dashboard' : 'landing');
  };

  const saveWorkspaceRemote = async (workspace: WorkspaceState) => {
    const response = await fetch('/api/workspace', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspace }),
    });

    const payload = (await response.json()) as { workspace?: WorkspaceState; user?: AuthUser; error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? 'Unable to sync workspace.');
    }

    if (payload.user) {
      setAuthUser(payload.user);
    }

    return payload.workspace ?? workspace;
  };

  const hydrateSession = async (payload: SessionResponse, options?: { mergeLocalIfRemoteEmpty?: boolean }) => {
    setAuthConfig(payload.authConfig ?? DEFAULT_AUTH_CONFIG);

    if (!payload.user) {
      setAuthUser(null);
      return;
    }

    setAuthUser(payload.user);

    const remoteWorkspace = normalizeWorkspaceState(payload.workspace);
    const localWorkspace = buildLocalWorkspace();

    if ((options?.mergeLocalIfRemoteEmpty ?? true) && isWorkspaceEmpty(remoteWorkspace) && !isWorkspaceEmpty(localWorkspace)) {
      await saveWorkspaceRemote(localWorkspace);
      setView(localWorkspace.studentProfile ? 'dashboard' : 'landing');
      return;
    }

    if (!isWorkspaceEmpty(remoteWorkspace)) {
      applyWorkspace(remoteWorkspace);
    } else {
      setView(studentProfile ? 'dashboard' : 'landing');
    }
  };

  useEffect(() => {
    if (studentProfile) {
      writeStored(STORAGE_KEYS.studentProfile, studentProfile);
    } else {
      clearStored([STORAGE_KEYS.studentProfile]);
    }
  }, [studentProfile]);

  useEffect(() => {
    writeStored(STORAGE_KEYS.professors, professors);
  }, [professors]);

  useEffect(() => {
    if (discoveryMeta) {
      writeStored(STORAGE_KEYS.discoveryMeta, discoveryMeta);
    } else {
      clearStored([STORAGE_KEYS.discoveryMeta]);
    }
  }, [discoveryMeta]);

  useEffect(() => {
    setMatches(recomputeMatches(studentProfile, professors));
  }, [studentProfile, professors]);

  useEffect(() => {
    writeStored(STORAGE_KEYS.matches, matches);
  }, [matches]);

  useEffect(() => {
    writeStored(STORAGE_KEYS.shortlistIds, shortlistIds);
  }, [shortlistIds]);

  useEffect(() => {
    writeStored(STORAGE_KEYS.comparisonIds, comparisonIds);
  }, [comparisonIds]);

  useEffect(() => {
    if (authUser) {
      writeStored(STORAGE_KEYS.authUser, authUser);
    } else {
      clearStored([STORAGE_KEYS.authUser]);
    }
  }, [authUser]);

  useEffect(() => {
    setShortlistIds((current) => {
      const next = normalizeIdSelection(current, professors, SHORTLIST_LIMIT);
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });

    setComparisonIds((current) => {
      const next = normalizeIdSelection(current, professors, COMPARISON_LIMIT, true);
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, [professors]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    setAuthUser((current) => {
      if (!current) {
        return current;
      }

      if (current.shortlistCount === shortlistIds.length && current.comparisonCount === comparisonIds.length) {
        return current;
      }

      return {
        ...current,
        shortlistCount: shortlistIds.length,
        comparisonCount: comparisonIds.length,
      };
    });
  }, [authUser, shortlistIds.length, comparisonIds.length]);

  const refreshRecommendations = async (
    profile: StudentProfile,
    successMessage: string,
    fallbackErrorMessage: string,
  ) => {
    const response = await fetch('/api/discover-researchers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentProfile: profile }),
    });

    const payload = (await response.json()) as DiscoverResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? fallbackErrorMessage);
    }

    const discovered = payload.professors ?? [];
    if (discovered.length === 0) {
      throw new Error('No researcher candidates were returned from the academic discovery sources.');
    }

    setProfessors((current) => mergeDiscoveredProfessors(current, discovered));
    setDiscoveryMeta(payload.discoveryMeta ?? null);
    toast.success(successMessage);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const payload = (await response.json()) as SessionResponse;
        if (cancelled) {
          return;
        }

        await hydrateSession(payload);
      } catch {
        if (!cancelled) {
          setAuthUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsAuthLoading(false);
          setHasHydratedSession(true);
        }
      }
    };

    void fetchSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedSession || !authUser) {
      return;
    }

    const workspace = buildLocalWorkspace();
    const timeout = window.setTimeout(async () => {
      setIsSyncingWorkspace(true);

      try {
        await saveWorkspaceRemote(workspace);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSyncingWorkspace(false);
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [hasHydratedSession, authUser?.id, studentProfile, professors, discoveryMeta, shortlistIds, comparisonIds]);

  useEffect(() => {
    if (!studentProfile || hasDiscoveryPool(professors) || isDiscoveringRecommendations || hasBootstrappedDiscovery) {
      return;
    }

    let cancelled = false;
    setHasBootstrappedDiscovery(true);

    const bootstrapDiscovery = async () => {
      setIsDiscoveringRecommendations(true);

      try {
        const response = await fetch('/api/discover-researchers', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ studentProfile }),
        });

        const payload = (await response.json()) as DiscoverResponse;
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to build the academic discovery dataset.');
        }

        const discovered = payload.professors ?? [];
        if (discovered.length === 0) {
          throw new Error('No researcher candidates were returned from the academic discovery sources.');
        }

        if (cancelled) {
          return;
        }

        setProfessors((current) => mergeDiscoveredProfessors(current, discovered));
        setDiscoveryMeta(payload.discoveryMeta ?? null);
        toast.success(`Loaded ${discovered.length} researchers from academic sources.`);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Unable to load the academic discovery dataset.');
        }
      } finally {
        if (!cancelled) {
          setIsDiscoveringRecommendations(false);
        }
      }
    };

    void bootstrapDiscovery();

    return () => {
      cancelled = true;
    };
  }, [studentProfile, professors, isDiscoveringRecommendations, hasBootstrappedDiscovery]);

  useEffect(() => {
    if (!hasHydratedSession || isAuthLoading) {
      return;
    }

    const url = new URL(window.location.href);
    const authStatus = url.searchParams.get('auth');
    const billingStatus = url.searchParams.get('billing');
    const sessionId = url.searchParams.get('session_id');

    if (!authStatus && !billingStatus && !sessionId) {
      return;
    }

    const consumeParams = async () => {
      if (authStatus === 'google-success') {
        toast.success('Signed in with Google.');
      } else if (authStatus === 'google-failed') {
        toast.error('Google sign-in could not be completed.');
      } else if (authStatus === 'google-unavailable') {
        toast.error('Google OAuth is not configured yet.');
      }

      if (billingStatus === 'cancel') {
        toast.message('Stripe checkout was canceled.');
      } else if (billingStatus === 'success' && sessionId && authUser) {
        try {
          const response = await fetch(`/api/billing/checkout-status?sessionId=${encodeURIComponent(sessionId)}`);
          const payload = (await response.json()) as CheckoutStatusResponse;
          if (response.ok) {
            const label = payload.subscriptionStatus ?? payload.status ?? 'completed';
            toast.success(`Stripe checkout ${label}.`);
          }
        } catch {
          toast.success('Stripe checkout completed. Your plan will update shortly.');
        }
      }

      url.searchParams.delete('auth');
      url.searchParams.delete('billing');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
    };

    void consumeParams();
  }, [hasHydratedSession, isAuthLoading, authUser]);

  const handleStart = () => {
    setView(studentProfile ? 'dashboard' : 'onboarding');
  };

  const handleOnboardingComplete = (profile: StudentProfile) => {
    const normalizedProfile = normalizeStudentProfile(profile);
    if (!normalizedProfile) {
      return;
    }

    setStudentProfile(normalizedProfile);
    setView('dashboard');
    setIsDiscoveringRecommendations(true);
    setHasBootstrappedDiscovery(true);

    void (async () => {
      try {
        await refreshRecommendations(
          normalizedProfile,
          'Profile saved. Loaded researchers from academic sources.',
          'Failed to build the academic discovery dataset.',
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Profile saved, but the academic dataset could not be refreshed.');
      } finally {
        setIsDiscoveringRecommendations(false);
      }
    })();
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const payload = (await response.json()) as SessionResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? 'Unable to create account.');
    }

    await hydrateSession(payload);
    toast.success('Account created.');
  };

  const handleLogin = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const payload = (await response.json()) as SessionResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? 'Unable to sign in.');
    }

    await hydrateSession(payload);
    toast.success('Signed in.');
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthUser(null);
      clearStored([STORAGE_KEYS.authUser]);
      toast.success('Signed out. Your current workspace stays on this browser until you reset it.');
    }
  };

  const handleStartCheckout = async () => {
    if (!authUser) {
      setPricingDialogOpen(false);
      setAuthDialogOpen(true);
      toast.message('Create an account before starting Stripe checkout.');
      return;
    }

    setIsStartingCheckout(true);
    try {
      const response = await fetch('/api/billing/create-checkout-session', { method: 'POST' });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? 'Unable to start Stripe checkout.');
      }

      window.location.assign(payload.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start Stripe checkout.');
    } finally {
      setIsStartingCheckout(false);
    }
  };

  const handleResetWorkspace = () => {
    const emptyWorkspace = createEmptyWorkspaceState();

    applyWorkspace(emptyWorkspace);
    clearStored([
      STORAGE_KEYS.studentProfile,
      STORAGE_KEYS.professors,
      STORAGE_KEYS.matches,
      STORAGE_KEYS.discoveryMeta,
      STORAGE_KEYS.shortlistIds,
      STORAGE_KEYS.comparisonIds,
    ]);
    setIsDiscoveringRecommendations(false);

    void (async () => {
      if (authUser) {
        try {
          await saveWorkspaceRemote(emptyWorkspace);
        } catch (error) {
          console.error(error);
        }
      }
    })();

    toast.success('Workspace cleared.');
  };

  const handleToggleComparison = (professorId: string) => {
    setComparisonIds((current) => {
      if (current.includes(professorId)) {
        return current.filter((id) => id !== professorId);
      }

      if (current.length >= COMPARISON_LIMIT) {
        toast.message('Comparison keeps only the 4 most recent selections.');
      }

      return [...new Set([...current, professorId])].slice(-COMPARISON_LIMIT);
    });
  };

  const handleToggleShortlist = (professorId: string) => {
    setShortlistIds((current) => {
      if (current.includes(professorId)) {
        toast.success('Removed from shortlist.');
        return current.filter((id) => id !== professorId);
      }

      if (current.length >= SHORTLIST_LIMIT) {
        toast.error('Your shortlist is full. Remove someone before adding another professor.');
        return current;
      }

      toast.success('Added to shortlist.');
      return [...current, professorId];
    });
  };

  const handleDownloadReport = (professor: Professor, match: MatchResult) => {
    if (!studentProfile) {
      return;
    }

    downloadProfessorReport({
      professor,
      match,
      studentProfile,
      isShortlisted: shortlistIds.includes(professor.id),
    });
    toast.success('Report downloaded.');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background font-sans text-foreground selection:bg-accent/15">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Landing
                onStart={handleStart}
                hasSavedProfile={Boolean(studentProfile)}
                authUser={authUser}
                authConfig={authConfig}
                onOpenAuth={() => setAuthDialogOpen(true)}
                onOpenPricing={() => setPricingDialogOpen(true)}
              />
            </motion.div>
          )}

          {view === 'onboarding' && (
            <motion.div key="onboarding" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Onboarding onComplete={handleOnboardingComplete} initialData={studentProfile} />
            </motion.div>
          )}

          {view === 'dashboard' && studentProfile && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Dashboard
                studentProfile={studentProfile}
                professors={professors}
                setProfessors={setProfessors}
                matches={matches}
                setMatches={setMatches}
                discoveryMeta={discoveryMeta}
                shortlistIds={shortlistIds}
                comparisonIds={comparisonIds}
                authUser={authUser}
                authConfig={authConfig}
                isDiscoveringRecommendations={isDiscoveringRecommendations}
                isSyncingWorkspace={isSyncingWorkspace}
                onSetShortlistIds={setShortlistIds}
                onSetComparisonIds={setComparisonIds}
                onToggleShortlist={handleToggleShortlist}
                onToggleComparison={handleToggleComparison}
                onRefreshRecommendations={() => {
                  setIsDiscoveringRecommendations(true);
                  setHasBootstrappedDiscovery(true);

                  void (async () => {
                    try {
                      await refreshRecommendations(
                        studentProfile,
                        'Refreshed researchers from academic sources.',
                        'Failed to refresh the academic discovery dataset.',
                      );
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Unable to refresh the academic discovery dataset.');
                    } finally {
                      setIsDiscoveringRecommendations(false);
                    }
                  })();
                }}
                onEditProfile={() => setView('onboarding')}
                onResetWorkspace={handleResetWorkspace}
                onOpenAuth={() => setAuthDialogOpen(true)}
                onOpenPricing={() => setPricingDialogOpen(true)}
                onSignOut={handleSignOut}
                onDownloadReport={handleDownloadReport}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AuthDialog
          open={authDialogOpen}
          onClose={() => setAuthDialogOpen(false)}
          onLogin={handleLogin}
          onSignup={handleSignup}
          googleOAuthEnabled={authConfig.googleOAuthEnabled}
        />

        <PricingDialog
          open={pricingDialogOpen}
          onClose={() => setPricingDialogOpen(false)}
          authUser={authUser}
          authConfig={authConfig}
          onOpenAuth={() => {
            setPricingDialogOpen(false);
            setAuthDialogOpen(true);
          }}
          onStartCheckout={handleStartCheckout}
          isLoading={isStartingCheckout}
        />

        <Toaster position="top-center" />
      </div>
    </ErrorBoundary>
  );
}
