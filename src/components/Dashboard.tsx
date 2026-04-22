import { startTransition, useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ComparisonView } from './ComparisonView';
import { ProfessorCard } from './ProfessorCard';
import { RadarChartComponent } from './RadarChart';
import { ThemeToggle } from './ThemeToggle';
import { getCountryLabel } from '@/lib/countries';
import type { AuthConfig, AuthUser, DiscoveryMeta, DiscoverySourceMeta, MatchResult, Professor, StudentProfile } from '@/types';
import { toast } from 'sonner';
import { Bookmark, GraduationCap, LayoutDashboard, Link as LinkIcon, Loader2, LogOut, Plus, RefreshCw, RotateCcw, Search, Settings, Sparkles, UserRound, Users } from 'lucide-react';

type IngestResponse = {
  professor: Professor;
  match: MatchResult;
};

const SHORTLIST_LIMIT = 40;

export function Dashboard({
  studentProfile,
  professors,
  setProfessors,
  matches,
  setMatches,
  discoveryMeta,
  shortlistIds,
  comparisonIds,
  authUser,
  authConfig,
  isDiscoveringRecommendations,
  isSyncingWorkspace,
  onSetShortlistIds,
  onSetComparisonIds,
  onToggleShortlist,
  onToggleComparison,
  onRefreshRecommendations,
  onEditProfile,
  onResetWorkspace,
  onOpenAuth,
  onOpenPricing,
  onSignOut,
  onDownloadReport,
}: {
  studentProfile: StudentProfile;
  professors: Professor[];
  setProfessors: (p: Professor[]) => void;
  matches: MatchResult[];
  setMatches: (m: MatchResult[]) => void;
  discoveryMeta: DiscoveryMeta | null;
  shortlistIds: string[];
  comparisonIds: string[];
  authUser: AuthUser | null;
  authConfig: AuthConfig;
  isDiscoveringRecommendations: boolean;
  isSyncingWorkspace: boolean;
  onSetShortlistIds: (ids: string[]) => void;
  onSetComparisonIds: (ids: string[]) => void;
  onToggleShortlist: (id: string) => void;
  onToggleComparison: (id: string) => void;
  onRefreshRecommendations: () => void;
  onEditProfile: () => void;
  onResetWorkspace: () => void;
  onOpenAuth: () => void;
  onOpenPricing: () => void;
  onSignOut: () => void;
  onDownloadReport: (professor: Professor, match: MatchResult) => void;
}) {
  const [activeTab, setActiveTab] = useState<'ranked' | 'shortlist' | 'compare'>('ranked');
  const [url, setUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);

  const sortedMatches = useMemo(() => [...matches].sort((a, b) => b.overallScore - a.overallScore), [matches]);
  const shortlistedMatches = useMemo(
    () => sortedMatches.filter((match) => shortlistIds.includes(match.professorId)),
    [shortlistIds, sortedMatches],
  );
  const visibleMatches = activeTab === 'shortlist' ? shortlistedMatches : sortedMatches;
  const selectedCount = comparisonIds.length;

  const handleIngest = async () => {
    if (!url) {
      return;
    }

    setIsIngesting(true);
    try {
      const response = await fetch('/api/ingest-profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, studentProfile }),
      });

      const payload = (await response.json()) as Partial<IngestResponse> & { error?: string };
      if (!response.ok || !payload.professor || !payload.match) {
        throw new Error(payload.error ?? 'Failed to ingest link.');
      }

      const duplicate = professors.find((entry) =>
        entry.fullName === payload.professor.fullName && entry.institution === payload.professor.institution,
      );
      const normalizedProfessor = duplicate ? { ...payload.professor, id: duplicate.id } : payload.professor;
      const normalizedMatch = { ...payload.match, professorId: normalizedProfessor.id };

      startTransition(() => {
        const nextProfessors = upsertProfessor(professors, normalizedProfessor);
        const nextMatches = upsertMatch(matches, normalizedMatch);
        setProfessors(nextProfessors);
        setMatches(nextMatches);
        onSetComparisonIds(uniqueLast([...comparisonIds, normalizedProfessor.id], 4));
      });

      setUrl('');
      toast.success(`Added ${normalizedProfessor.fullName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to ingest profile. Please try another public link.');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleDeleteProfessor = (id: string) => {
    setProfessors(professors.filter((professor) => professor.id !== id));
    setMatches(matches.filter((match) => match.professorId !== id));
    onSetShortlistIds(shortlistIds.filter((entry) => entry !== id));
    onSetComparisonIds(comparisonIds.filter((entry) => entry !== id));
    toast.success('Professor removed from your workspace.');
  };

  const detailProfessorId =
    [...comparisonIds].reverse().find((id) => visibleMatches.some((match) => match.professorId === id))
    ?? visibleMatches[0]?.professorId;
  const detailMatch = detailProfessorId
    ? visibleMatches.find((match) => match.professorId === detailProfessorId) ?? visibleMatches[0]
    : undefined;
  const detailProfessor = detailMatch
    ? professors.find((professor) => professor.id === detailMatch.professorId) ?? null
    : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="h-[60px] flex-shrink-0 bg-primary px-6 text-primary-foreground">
        <div className="flex h-full items-center justify-between gap-4">
          <div className="flex items-center gap-3 font-bold tracking-tight">
            <GraduationCap className="size-6" />
            <span className="text-lg">MentorFit</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-full bg-primary-foreground/10 px-4 py-1.5 text-sm md:flex md:items-center md:gap-2">
              <span className="size-2 rounded-full bg-success" />
              {studentProfile.name} • {studentProfile.field}
            </div>

            {authUser ? (
              <div className="hidden rounded-full bg-primary-foreground/10 px-4 py-1.5 text-sm lg:flex lg:items-center lg:gap-2">
                <UserRound className="size-4" />
                {authUser.name} • {authUser.plan.toUpperCase()}
              </div>
            ) : null}

            <ThemeToggle className="border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15" />

            {!authUser ? (
              <Button
                onClick={onOpenAuth}
                size="sm"
                variant="outline"
                className="border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15"
              >
                Create Account
              </Button>
            ) : (
              <Button
                onClick={onSignOut}
                size="sm"
                variant="outline"
                className="border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15"
              >
                <LogOut className="mr-2 size-4" />
                Sign Out
              </Button>
            )}

            <Button
              onClick={onOpenPricing}
              size="sm"
              variant="outline"
              className="border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15"
            >
              <Sparkles className="mr-2 size-4" />
              {authUser?.plan === 'pro' ? 'Plan' : 'Pricing'}
            </Button>

            <Button
              onClick={onEditProfile}
              disabled={isDiscoveringRecommendations || isIngesting}
              size="sm"
              variant="outline"
              className="border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15"
            >
              <Settings className="mr-2 size-4" />
              Edit Profile
            </Button>

            <Button
              onClick={onRefreshRecommendations}
              disabled={isDiscoveringRecommendations || isIngesting}
              size="sm"
              variant="outline"
              className="border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15"
            >
              {isDiscoveringRecommendations ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
              Refresh Pool
            </Button>

            <Button
              onClick={handleIngest}
              disabled={isIngesting || isDiscoveringRecommendations || !url}
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isIngesting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
              Add URL
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[290px] flex-shrink-0 overflow-y-auto border-r border-border bg-card p-5">
          <div className="space-y-6">
            <section>
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Account</h2>
              <div className="rounded-xl border border-border bg-background p-4 text-sm">
                {authUser ? (
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold">{authUser.name}</p>
                      <p className="text-xs text-muted-foreground">{authUser.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight">
                        {authUser.plan}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight">
                        {shortlistIds.length}/{SHORTLIST_LIMIT} shortlisted
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {isSyncingWorkspace ? 'Syncing your workspace to this account.' : 'Your shortlist, comparisons, and profile are synced to this account.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      You can keep working locally, or create an account to sync your shortlist and comparison workspace.
                    </p>
                    <Button size="sm" className="w-full" onClick={onOpenAuth}>
                      Create Account
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Focus</h2>
              <div className="space-y-3 rounded-xl border border-border bg-background p-4 text-sm leading-relaxed">
                <div>
                  <span className="font-semibold">Interests:</span> {studentProfile.researchInterests.slice(0, 140)}
                </div>
                <div>
                  <p className="mb-2 font-semibold">Countries</p>
                  {studentProfile.preferredCountries.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {studentProfile.preferredCountries.map((country) => (
                        <Badge key={country} variant="outline" className="text-[10px] font-bold uppercase tracking-tight">
                          {getCountryLabel(country)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No country filter applied.</p>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Scoring Weights</h2>
              <div className="space-y-4">
                <WeightRow label="Topic Overlap" value={studentProfile.preferences.topicOverlap} />
                <WeightRow label="Methods Fit" value={studentProfile.preferences.methodsOverlap} />
                <WeightRow label="Trajectory" value={studentProfile.preferences.trajectory} />
                <WeightRow label="Mentorship" value={studentProfile.preferences.mentorship} />
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">How Ranking Works</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                MentorFit builds its main dataset from OpenAlex, ORCID, Semantic Scholar, and public faculty or lab pages, then ranks those researchers with the same rubric used for pasted URLs.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Discovery Sources</h2>
              {discoveryMeta ? (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Built {discoveryMeta.resultCount} ranked profiles from {discoveryMeta.candidateCount} OpenAlex candidates.
                  </p>
                  <div className="space-y-2">
                    {discoveryMeta.sources.map((source) => (
                      <div key={source.source}>
                        <SourceStatusRow source={source} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Discovery metadata will appear after MentorFit finishes building the first academic-source pool.
                </p>
              )}
            </section>
          </div>

          <nav className="mt-6 space-y-1">
            <SidebarItem icon={<LayoutDashboard className="size-4" />} label={`Ranked Results (${professors.length})`} active={activeTab === 'ranked'} onClick={() => setActiveTab('ranked')} />
            <SidebarItem icon={<Bookmark className="size-4" />} label={`Shortlist (${shortlistIds.length}/${SHORTLIST_LIMIT})`} active={activeTab === 'shortlist'} onClick={() => setActiveTab('shortlist')} />
            <SidebarItem icon={<Users className="size-4" />} label={`Compare View (${comparisonIds.length})`} active={activeTab === 'compare'} onClick={() => setActiveTab('compare')} />
            <SidebarItem icon={<Settings className="size-4" />} label="Edit Profile" onClick={onEditProfile} />
            <SidebarItem icon={<RotateCcw className="size-4" />} label="Reset Workspace" onClick={onResetWorkspace} />
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {activeTab === 'ranked'
                    ? `Ranked Matches (${professors.length})`
                    : activeTab === 'shortlist'
                      ? `Shortlist (${shortlistIds.length}/${SHORTLIST_LIMIT})`
                      : 'Side-by-Side Comparison'}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {activeTab === 'ranked'
                    ? 'Your ranked pool comes from live academic sources matched to your profile. Use Compare to build the side-by-side set, and Shortlist to save the people you actually want to keep.'
                    : activeTab === 'shortlist'
                      ? 'Your shortlist is capped at 40. This is the working set you can come back to later inside the same account.'
                      : 'Review your selected professors side-by-side, then return to ranked or shortlist views to adjust the comparison set.'}
                </p>
              </div>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Paste Scholar, ORCID, or faculty URL..."
                  className="h-9 w-full rounded-md bg-background pl-9 text-sm md:w-80"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleIngest()}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'compare' ? (
                <motion.div key="compare" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ComparisonView
                    professors={professors.filter((professor) => comparisonIds.includes(professor.id))}
                    matches={matches.filter((match) => comparisonIds.includes(match.professorId))}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]"
                >
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold">Compare up to 4 professors</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            The detail panel follows your latest comparison selection. Shortlist is separate from compare, so you can keep a wider longlist without crowding the side-by-side view.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight">
                            {selectedCount} Selected
                          </Badge>
                          <Button variant="outline" size="sm" disabled={selectedCount === 0} onClick={() => onSetComparisonIds([])}>
                            Clear Selection
                          </Button>
                          <Button size="sm" disabled={selectedCount < 2} onClick={() => setActiveTab('compare')}>
                            Compare Selected
                          </Button>
                        </div>
                      </div>
                    </div>

                    {visibleMatches.length === 0 ? (
                      <EmptyState
                        isDiscoveringRecommendations={isDiscoveringRecommendations}
                        isShortlistView={activeTab === 'shortlist'}
                      />
                    ) : (
                      visibleMatches.map((match, index) => {
                        const professor = professors.find((entry) => entry.id === match.professorId);
                        if (!professor) {
                          return null;
                        }

                        return (
                          <div key={professor.id}>
                            <ProfessorCard
                              professor={professor}
                              match={match}
                              rank={index + 1}
                              isSelected={comparisonIds.includes(professor.id)}
                              isShortlisted={shortlistIds.includes(professor.id)}
                              onSelect={() => onToggleComparison(professor.id)}
                              onToggleShortlist={() => onToggleShortlist(professor.id)}
                              onDelete={(event) => {
                                event.stopPropagation();
                                handleDeleteProfessor(professor.id);
                              }}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="hidden lg:block">
                    {detailMatch && detailProfessor ? (
                      <div className="sticky top-0 space-y-6">
                        <DetailPanel
                          match={detailMatch}
                          professor={detailProfessor}
                          isShortlisted={shortlistIds.includes(detailProfessor.id)}
                          canAddToShortlist={shortlistIds.length < SHORTLIST_LIMIT || shortlistIds.includes(detailProfessor.id)}
                          onToggleShortlist={() => onToggleShortlist(detailProfessor.id)}
                          onDownloadReport={() => onDownloadReport(detailProfessor, detailMatch)}
                        />
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-card text-sm text-muted-foreground">
                        Select a mentor to see analysis
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

function uniqueLast(values: string[], limit: number) {
  return [...new Set(values)].slice(-limit);
}

function upsertProfessor(existing: Professor[], incoming: Professor) {
  const duplicate = existing.find((professor) => professor.id === incoming.id);
  if (!duplicate) {
    return [...existing, incoming];
  }

  return existing.map((professor) => (professor.id === incoming.id ? incoming : professor));
}

function upsertMatch(existing: MatchResult[], incoming: MatchResult) {
  const duplicate = existing.find((match) => match.professorId === incoming.professorId);
  if (!duplicate) {
    return [...existing, incoming];
  }

  return existing.map((match) => (match.professorId === incoming.professorId ? incoming : match));
}

function WeightRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-[11px] font-medium">
        <span>{label}</span>
        <span className="text-accent">{value}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SourceStatusRow({ source }: { source: DiscoverySourceMeta }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold">{formatSourceLabel(source.source)}</span>
        <Badge className={sourceStatusClassName(source.status)}>{source.status}</Badge>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{source.detail}</p>
    </div>
  );
}

function DetailPanel({
  match,
  professor,
  isShortlisted,
  canAddToShortlist,
  onToggleShortlist,
  onDownloadReport,
}: {
  match: MatchResult;
  professor: Professor;
  isShortlisted: boolean;
  canAddToShortlist: boolean;
  onToggleShortlist: () => void;
  onDownloadReport: () => void;
}) {
  const confidenceLabel = match.confidence >= 0.8 ? 'High confidence' : match.confidence >= 0.6 ? 'Moderate confidence' : 'Low confidence';

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">Analysis: {professor.fullName}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{[professor.institution, professor.department, professor.country].filter(Boolean).join(' • ')}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {professor.profileOrigin === 'discovery' ? (
            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tight">
              Academic Dataset
            </Badge>
          ) : null}
          {professor.sourceType ? (
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight">
              {professor.sourceType}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex aspect-square items-center justify-center rounded-lg border border-border/50 bg-muted/40">
        <RadarChartComponent match={match} size={220} />
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="size-2 rounded-full bg-success" />
        <span>{confidenceLabel} ({Math.round(match.confidence * 100)}%)</span>
      </div>

      <p className="border-t border-border pt-4 text-sm leading-relaxed text-foreground">{match.explanation}</p>

      {match.limitation ? (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Limitation</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{match.limitation}</p>
        </div>
      ) : null}

      {professor.highlights?.length ? (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Profile Signals</p>
          <div className="space-y-2">
            {professor.highlights.map((highlight) => (
              <div key={highlight} className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="break-words text-xs leading-relaxed text-foreground">{highlight}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-2 space-y-2">
        <Button className="h-10 w-full font-semibold" onClick={onToggleShortlist} disabled={!canAddToShortlist}>
          {isShortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
        </Button>
        <Button variant="outline" className="h-10 w-full text-sm font-semibold" onClick={onDownloadReport}>
          Download Report
        </Button>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({
  isDiscoveringRecommendations,
  isShortlistView,
}: {
  isDiscoveringRecommendations: boolean;
  isShortlistView: boolean;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card py-24 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-secondary">
        {isDiscoveringRecommendations ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : <Search className="size-6 text-muted-foreground" />}
      </div>
      <h3 className="mb-1 text-lg font-bold">
        {isDiscoveringRecommendations ? 'Building researcher pool' : isShortlistView ? 'No shortlisted profiles yet' : 'No profiles available'}
      </h3>
      <p className="mx-auto max-w-xs text-sm text-muted-foreground">
        {isDiscoveringRecommendations
          ? 'MentorFit is fetching candidates from OpenAlex, ORCID, Semantic Scholar, and public faculty or lab pages.'
          : isShortlistView
            ? 'Use Add to Shortlist on any ranked result to build the longlist you want to keep.'
            : 'No academic-source candidates are loaded in this session yet. Refresh the pool or paste a public profile URL above.'}
      </p>
    </div>
  );
}

function formatSourceLabel(source: DiscoverySourceMeta['source']) {
  switch (source) {
    case 'openAlex':
      return 'OpenAlex';
    case 'orcid':
      return 'ORCID';
    case 'semanticScholar':
      return 'Semantic Scholar';
    case 'facultyPages':
      return 'Faculty Pages';
    default:
      return source;
  }
}

function sourceStatusClassName(status: DiscoverySourceMeta['status']) {
  if (status === 'success') {
    return 'border-transparent bg-success/15 text-success hover:bg-success/15';
  }

  if (status === 'degraded') {
    return 'border-transparent bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300';
  }

  return 'border-transparent bg-secondary text-muted-foreground hover:bg-secondary';
}
