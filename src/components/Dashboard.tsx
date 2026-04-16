import React, { startTransition, useMemo, useState } from 'react';
import { StudentProfile, Professor, MatchResult } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, GraduationCap, LayoutDashboard, Users, Settings, Loader2, Link as LinkIcon, RotateCcw } from 'lucide-react';
import { ProfessorCard } from './ProfessorCard';
import { ComparisonView } from './ComparisonView';
import { RadarChartComponent } from './RadarChart';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeToggle } from './ThemeToggle';

type IngestResponse = {
  professor: Professor;
  match: MatchResult;
};

export function Dashboard({
  studentProfile,
  professors,
  setProfessors,
  matches,
  setMatches,
  onEditProfile,
  onLogout,
}: {
  studentProfile: StudentProfile;
  professors: Professor[];
  setProfessors: (p: Professor[]) => void;
  matches: MatchResult[];
  setMatches: (m: MatchResult[]) => void;
  onEditProfile: () => void;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'ranked' | 'compare'>('ranked');
  const [url, setUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [selectedProfIds, setSelectedProfIds] = useState<string[]>([]);

  const sortedMatches = useMemo(() => [...matches].sort((a, b) => b.overallScore - a.overallScore), [matches]);

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

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to ingest link.');
      }

      const { professor, match } = payload as IngestResponse;
      const duplicate = professors.find((entry) =>
        entry.fullName === professor.fullName && entry.institution === professor.institution,
      );
      const normalizedProfessor = duplicate ? { ...professor, id: duplicate.id } : professor;
      const normalizedMatch = { ...match, professorId: normalizedProfessor.id };

      startTransition(() => {
        const nextProfessors = upsertProfessor(professors, normalizedProfessor);
        const nextMatches = upsertMatch(matches, normalizedMatch);
        setProfessors(nextProfessors);
        setMatches(nextMatches);
        setSelectedProfIds((current) => uniqueLast([...current, normalizedProfessor.id], 4));
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
    const updatedProfs = professors.filter((professor) => professor.id !== id);
    const updatedMatches = matches.filter((match) => match.professorId !== id);

    setProfessors(updatedProfs);
    setMatches(updatedMatches);
    setSelectedProfIds((current) => current.filter((selectedId) => selectedId !== id));
    toast.success('Professor removed from shortlist.');
  };

  const detailMatch = sortedMatches[0];
  const detailProfessor = detailMatch ? professors.find((professor) => professor.id === detailMatch.professorId) : null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="h-[60px] bg-primary text-primary-foreground flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <GraduationCap className="w-6 h-6" />
          <span>MentorFit</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex bg-primary-foreground/10 px-4 py-1.5 rounded-full text-sm items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            {studentProfile.name} • {studentProfile.field}
          </div>
          <ThemeToggle className="border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15" />
          <Button
            onClick={handleIngest}
            disabled={isIngesting || !url}
            size="sm"
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          >
            {isIngesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Add Profile
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[280px] bg-card border-r border-border p-5 flex flex-col gap-6 flex-shrink-0">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Current Focus</h2>
            <div className="p-3 border border-border rounded-lg bg-background text-sm leading-relaxed">
              <span className="font-semibold">Interests:</span> {studentProfile.researchInterests.slice(0, 120)}
            </div>
          </div>

          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Scoring Weights</h2>
            <div className="space-y-4">
              <WeightRow label="Topic Overlap" value={studentProfile.preferences.topicOverlap} />
              <WeightRow label="Methods Fit" value={studentProfile.preferences.methodsOverlap} />
              <WeightRow label="Trajectory" value={studentProfile.preferences.trajectory} />
              <WeightRow label="Mentorship" value={studentProfile.preferences.mentorship} />
            </div>
          </div>

          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">How Ingest Works</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              MentorFit fetches lightweight public metadata from the pasted link, infers a research track, and scores fit with a fixed deterministic rubric. No Gemini or login flow is involved.
            </p>
          </div>

          <nav className="mt-auto space-y-1">
            <SidebarItem icon={<LayoutDashboard className="w-4 h-4" />} label="Ranked Results" active={activeTab === 'ranked'} onClick={() => setActiveTab('ranked')} />
            <SidebarItem icon={<Users className="w-4 h-4" />} label="Compare View" active={activeTab === 'compare'} onClick={() => setActiveTab('compare')} />
            <SidebarItem icon={<Settings className="w-4 h-4" />} label="Edit Profile" onClick={onEditProfile} />
            <SidebarItem icon={<RotateCcw className="w-4 h-4" />} label="Reset Session" onClick={onLogout} />
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {activeTab === 'ranked' ? `Ranked Matches (${professors.length})` : 'Side-by-Side Comparison'}
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Paste a Scholar, ORCID, lab, or faculty page URL to generate a new mentor profile.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Paste Scholar, ORCID, or faculty URL..."
                    className="pl-9 w-full md:w-80 h-9 text-sm rounded-md bg-background"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleIngest()}
                  />
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'ranked' ? (
                <motion.div
                  key="ranked"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6"
                >
                  <div className="space-y-4">
                    {professors.length === 0 ? (
                      <EmptyState />
                    ) : (
                      sortedMatches.map((match, index) => {
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
                              isSelected={selectedProfIds.includes(professor.id)}
                              onSelect={() => {
                                setSelectedProfIds((current) =>
                                  current.includes(professor.id)
                                    ? current.filter((id) => id !== professor.id)
                                    : uniqueLast([...current, professor.id], 4),
                                );
                              }}
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
                        <DetailPanel match={detailMatch} professor={detailProfessor} />
                      </div>
                    ) : (
                      <div className="h-full border border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground text-sm bg-card">
                        Select a mentor to see analysis
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="compare" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ComparisonView
                    professors={professors.filter((professor) => selectedProfIds.includes(professor.id))}
                    matches={matches.filter((match) => selectedProfIds.includes(match.professorId))}
                  />
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
      <div className="h-1 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function DetailPanel({ match, professor }: { match: MatchResult; professor: Professor }) {
  const confidenceLabel = match.confidence >= 0.8 ? 'High confidence' : match.confidence >= 0.6 ? 'Moderate confidence' : 'Low confidence';

  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm">Analysis: {professor.fullName}</h3>
          <p className="text-xs text-muted-foreground mt-1">{professor.institution} • {professor.department}</p>
        </div>
        {professor.sourceType && (
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight">
            {professor.sourceType}
          </Badge>
        )}
      </div>

      <div className="aspect-square bg-muted/40 rounded-lg flex items-center justify-center border border-border/50">
        <RadarChartComponent match={match} size={220} />
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-success" />
        <span>{confidenceLabel} ({Math.round(match.confidence * 100)}%)</span>
      </div>

      <p className="text-sm leading-relaxed text-foreground border-t border-border pt-4">{match.explanation}</p>

      {match.limitation && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Limitation</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{match.limitation}</p>
        </div>
      )}

      {professor.highlights?.length ? (
        <div className="flex flex-wrap gap-2">
          {professor.highlights.map((highlight) => (
            <Badge key={highlight} variant="secondary" className="text-[11px] leading-relaxed whitespace-normal">
              {highlight}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-2 space-y-2">
        <Button className="w-full bg-primary text-primary-foreground h-10 font-semibold">Add to Shortlist</Button>
        <Button variant="outline" className="w-full h-10 font-semibold text-sm">Download Report</Button>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-24 border border-dashed border-border rounded-lg bg-card">
      <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
        <Search className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold mb-1">No profiles added</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        Paste a public link above to start your mentor match analysis. ORCID and faculty pages usually produce the richest preview.
      </p>
    </div>
  );
}
