import type { MouseEvent } from 'react';
import { Professor, MatchResult } from '@/types';
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, GitCompareArrows, Trash2 } from 'lucide-react';

export function ProfessorCard({ 
  professor, 
  match, 
  rank,
  isSelected, 
  onSelect,
  onDelete
}: { 
  professor: Professor, 
  match: MatchResult,
  rank: number,
  isSelected: boolean,
  onSelect: () => void,
  onDelete: (e: MouseEvent) => void
}) {
  return (
    <div 
      onClick={onSelect}
      className={`bg-card border rounded-lg p-4 flex gap-4 transition-all cursor-pointer relative group ${isSelected ? 'border-2 border-accent shadow-lg shadow-accent/5' : 'border-border hover:border-accent/50'}`}
    >
      <button 
        onClick={onDelete}
        className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remove professor"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      <div className="w-8 h-8 bg-primary text-primary-foreground rounded flex items-center justify-center font-bold text-sm flex-shrink-0">
        {rank}
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <div>
            <h3 className="font-bold text-base text-foreground">{professor.fullName}</h3>
            <p className="text-xs text-muted-foreground">{[professor.institution, professor.department, professor.country].filter(Boolean).join(' • ')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
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
          <div className="text-right">
            <p className="text-xl font-extrabold text-accent leading-none">{match.overallScore}</p>
            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">Match Score</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {professor.publications?.[0]?.keywords?.slice(0, 3).map(kw => (
            <span key={kw} className="text-[10px] font-semibold bg-accent/8 text-accent px-2 py-0.5 rounded border border-accent/15">
              {kw}
            </span>
          ))}
        </div>

        <div className="flex gap-3 mt-3">
          <ScoreBadge label="Topic" value={match.subscores.topic} />
          <ScoreBadge label="Methods" value={match.subscores.methods} />
          <ScoreBadge label="Recency" value={match.subscores.activity > 80 ? 'High' : match.subscores.activity > 50 ? 'Med' : 'Low'} />
          <ScoreBadge label="Confidence" value={`${Math.round(match.confidence * 100)}%`} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground">
            {isSelected ? 'Selected for comparison' : 'Select this card to compare'}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              isSelected
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-muted-foreground hover:border-accent/40 hover:text-foreground'
            }`}
          >
            {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <GitCompareArrows className="w-3.5 h-3.5" />}
            {isSelected ? 'Selected' : 'Compare'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ label, value }: { label: string, value: number | string }) {
  return (
    <span className="text-[11px] px-2 py-0.5 bg-secondary border border-border rounded text-foreground font-medium">
      {label}: {value}
    </span>
  );
}
