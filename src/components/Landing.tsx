import type React from 'react';
import { motion } from 'motion/react';
import { BarChart3, GraduationCap, Search, Sparkles, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SuccessStories } from './SuccessStories';
import { ThemeToggle } from './ThemeToggle';
import type { AuthConfig, AuthUser } from '@/types';

export function Landing({
  onStart,
  hasSavedProfile,
  authUser,
  authConfig,
  onOpenAuth,
  onOpenPricing,
}: {
  onStart: () => void;
  hasSavedProfile: boolean;
  authUser: AuthUser | null;
  authConfig: AuthConfig;
  onOpenAuth: () => void;
  onOpenPricing: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <header className="mb-24 flex items-center justify-between">
        <div className="flex items-center gap-2 font-serif text-2xl italic">
          <GraduationCap className="size-8 text-accent" />
          <span>MentorFit</span>
        </div>
        <div className="flex items-center gap-3">
          {authUser ? (
            <div className="hidden rounded-full border border-border bg-card px-4 py-2 text-sm md:block">
              {authUser.name} • {authUser.plan.toUpperCase()}
            </div>
          ) : (
            <Button variant="outline" onClick={onOpenAuth}>
              Create Account
            </Button>
          )}
          <Button variant="outline" onClick={onOpenPricing}>
            <Sparkles className="mr-2 size-4" />
            {authConfig.stripeBillingEnabled ? 'Pricing' : 'Plans'}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-6xl font-bold leading-[1.05] tracking-tight md:text-7xl"
          >
            Find your ideal <br />
            <span className="text-accent">PhD Mentor.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10 max-w-xl text-xl leading-relaxed text-muted-foreground"
          >
            A deterministic decision-support workspace for ranking potential advisors, saving a shortlist, and comparing researcher fit across a synced account.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center gap-4"
          >
            <Button
              onClick={onStart}
              size="lg"
              className="rounded-md bg-accent px-8 py-6 text-lg font-bold text-accent-foreground hover:bg-accent/90"
            >
              {hasSavedProfile ? 'Continue workspace' : 'Build your profile'}
            </Button>
            <p className="max-w-xs text-sm text-muted-foreground">
              Start locally, or create an account to sync your shortlist, comparisons, and discovery pool across sessions.
            </p>
          </motion.div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.16),transparent_50%)] opacity-90 blur-3xl dark:bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.14),transparent_50%)]" />
          <div className="grid grid-cols-2 gap-4">
            <FeatureCard
              icon={<Search className="size-6" />}
              title="Live Discovery"
              desc="Build a ranked advisor pool from OpenAlex, ORCID, Semantic Scholar, and public faculty or lab pages."
            />
            <FeatureCard
              icon={<BarChart3 className="size-6" />}
              title="Fit Scoring"
              desc="Transparent scoring across topic overlap, methods, trajectory, activity, network, and mentorship signals."
            />
            <FeatureCard
              icon={<Users className="size-6" />}
              title="Compare & Shortlist"
              desc="Keep a 40-profile shortlist and compare up to four professors side-by-side without losing the wider longlist."
            />
            <FeatureCard
              icon={<Sparkles className="size-6" />}
              title="Account Sync"
              desc="Create an account to persist your workspace, access Stripe-backed billing, and carry your shortlist forward."
            />
          </div>
        </div>
      </main>

      <section className="mt-32 border-t border-border pt-20">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-accent">Step 01</span>
            <h3 className="mb-4 text-2xl font-bold">Define Interests</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Tell MentorFit what you want to study, how you like to work, and which dimensions matter most to your eventual advisor fit.
            </p>
          </div>
          <div>
            <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-accent">Step 02</span>
            <h3 className="mb-4 text-2xl font-bold">Build the Pool</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              MentorFit discovers researchers from academic sources, then lets you add manual URLs for professors you already know you want to inspect.
            </p>
          </div>
          <div>
            <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-accent">Step 03</span>
            <h3 className="mb-4 text-2xl font-bold">Shortlist & Decide</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Save your top researchers, compare them side-by-side, and export a report before making outreach decisions.
            </p>
          </div>
        </div>
      </section>

      <SuccessStories />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/90 p-8 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md">
      <div className="mb-6 flex size-12 items-center justify-center rounded-lg bg-secondary text-accent">
        {icon}
      </div>
      <h4 className="mb-2 text-xl font-bold">{title}</h4>
      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
