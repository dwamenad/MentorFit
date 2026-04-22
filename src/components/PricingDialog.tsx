import type { ReactNode } from 'react';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AuthConfig, AuthUser } from '@/types';

const FREE_FEATURES = [
  'Build a local research fit profile',
  'Discover and rank advisors from academic sources',
  'Compare up to 4 researchers side-by-side',
];

const PRO_FEATURES = [
  'Stripe-backed account billing infrastructure',
  'Plan-aware workspace ready for premium features',
  'Prepared for premium exports and expanded discovery capacity',
];

export function PricingDialog({
  open,
  onClose,
  authUser,
  authConfig,
  onOpenAuth,
  onStartCheckout,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  authUser: AuthUser | null;
  authConfig: AuthConfig;
  onOpenAuth: () => void;
  onStartCheckout: () => Promise<void>;
  isLoading: boolean;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-[32px] border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              Pricing
            </p>
            <h2 className="mt-2 text-3xl font-bold">MentorFit plans</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Accounts stay usable on the free tier. Stripe powers the upgrade path for synced workspaces, exports, and future premium discovery features.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <PlanCard
            accent="border-border"
            label="Free"
            price="$0"
            description="Local-first workspace for discovery, ranking, and quick advisor comparisons."
            features={FREE_FEATURES}
            action={
              <Button variant="outline" className="w-full" onClick={onClose}>
                Keep Free Plan
              </Button>
            }
          />

          <PlanCard
            accent="border-accent/40 shadow-[0_18px_60px_rgba(37,99,235,0.12)]"
            label="Pro"
            price={authConfig.proPriceLabel}
            description="The upgrade path is wired through Stripe so MentorFit can support paid premium features cleanly as the product expands."
            features={PRO_FEATURES}
            action={
              authUser ? (
                <Button
                  className="w-full font-semibold"
                  onClick={() => void onStartCheckout()}
                  disabled={!authConfig.stripeBillingEnabled || isLoading || authUser.plan === 'pro'}
                >
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {authUser.plan === 'pro' ? 'Current Plan' : authConfig.stripeBillingEnabled ? 'Upgrade with Stripe' : 'Stripe Not Configured'}
                </Button>
              ) : (
                <Button className="w-full font-semibold" onClick={onOpenAuth}>
                  Create Account to Upgrade
                </Button>
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  label,
  price,
  description,
  features,
  action,
  accent,
}: {
  label: string;
  price: string;
  description: string;
  features: string[];
  action: ReactNode;
  accent: string;
}) {
  return (
    <div className={`rounded-[28px] border bg-background/80 p-6 ${accent}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <h3 className="mt-3 text-4xl font-bold">{price}</h3>
        </div>
        {label === 'Pro' ? (
          <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
            Recommended
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{description}</p>

      <div className="mt-6 space-y-3">
        {features.map((feature) => (
          <div key={feature} className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 text-accent" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <div className="mt-8">{action}</div>
    </div>
  );
}
