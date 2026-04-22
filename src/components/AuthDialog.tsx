import { useEffect, useState } from 'react';
import { Loader2, Mail, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type AuthMode = 'signup' | 'login';

export function AuthDialog({
  open,
  onClose,
  onLogin,
  onSignup,
  googleOAuthEnabled,
}: {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (name: string, email: string, password: string) => Promise<void>;
  googleOAuthEnabled: boolean;
}) {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim() || (mode === 'signup' && !name.trim())) {
      toast.error('Complete all required fields first.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        await onSignup(name, email, password);
      }

      setName('');
      setEmail('');
      setPassword('');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to finish authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              Account
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              {mode === 'signup' ? 'Create your MentorFit account' : 'Sign in to MentorFit'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Accounts sync your shortlist, comparison set, and discovered researcher pool across sessions.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Sign In
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {mode === 'signup' ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Name</label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={name} onChange={(event) => setName(event.target.value)} className="pl-9 h-10" placeholder="Alex Chen" />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={email} onChange={(event) => setEmail(event.target.value)} className="pl-9 h-10" placeholder="you@example.com" type="email" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Password</label>
            <Input value={password} onChange={(event) => setPassword(event.target.value)} className="h-10" placeholder="At least 8 characters" type="password" />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Button onClick={handleSubmit} className="h-10 w-full font-semibold" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === 'signup' ? 'Create Account' : 'Sign In'}
          </Button>

          <Button
            variant="outline"
            className="h-10 w-full font-semibold"
            disabled={!googleOAuthEnabled || isSubmitting}
            onClick={() => {
              if (!googleOAuthEnabled) {
                toast.error('Google OAuth is not configured yet.');
                return;
              }

              window.location.assign('/auth/google/start');
            }}
          >
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
