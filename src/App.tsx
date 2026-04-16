import { useEffect, useState, ReactNode } from 'react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './components/ui/button';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { Landing } from './components/Landing';
import { MatchResult, Professor, StudentProfile } from './types';
import { clearStored, readStored, STORAGE_KEYS, writeStored } from './lib/persistence';

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
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(() =>
    readStored<StudentProfile | null>(STORAGE_KEYS.studentProfile, null),
  );
  const [professors, setProfessors] = useState<Professor[]>(() =>
    readStored<Professor[]>(STORAGE_KEYS.professors, []),
  );
  const [matches, setMatches] = useState<MatchResult[]>(() =>
    readStored<MatchResult[]>(STORAGE_KEYS.matches, []),
  );
  const [view, setView] = useState<'landing' | 'onboarding' | 'dashboard'>(() =>
    readStored<StudentProfile | null>(STORAGE_KEYS.studentProfile, null) ? 'dashboard' : 'landing',
  );

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
    writeStored(STORAGE_KEYS.matches, matches);
  }, [matches]);

  const handleStart = () => {
    setView(studentProfile ? 'dashboard' : 'onboarding');
  };

  const handleOnboardingComplete = (profile: StudentProfile) => {
    setStudentProfile(profile);
    setView('dashboard');
    toast.success('Profile saved locally.');
  };

  const updateProfessors = (next: Professor[]) => {
    setProfessors(next);
  };

  const updateMatches = (next: MatchResult[]) => {
    setMatches(next);
  };

  const handleReset = () => {
    setStudentProfile(null);
    setProfessors([]);
    setMatches([]);
    clearStored([STORAGE_KEYS.studentProfile, STORAGE_KEYS.professors, STORAGE_KEYS.matches]);
    setView('landing');
    toast.success('Saved session cleared.');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/15">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Landing onStart={handleStart} hasSavedProfile={Boolean(studentProfile)} />
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
                setProfessors={updateProfessors}
                matches={matches}
                setMatches={updateMatches}
                onEditProfile={() => setView('onboarding')}
                onLogout={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <Toaster position="top-center" />
      </div>
    </ErrorBoundary>
  );
}
