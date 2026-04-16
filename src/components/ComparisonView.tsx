import React from 'react';
import { Professor, MatchResult } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadarChartComponent } from './RadarChart';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

export function ComparisonView({ professors, matches }: { professors: Professor[], matches: MatchResult[] }) {
  if (professors.length === 0) {
    return (
      <div className="text-center py-20 bg-card rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground text-sm">Select up to 4 professors from the rankings to compare them side-by-side.</p>
      </div>
    );
  }

  const dimensions = [
    { key: 'overallScore', label: 'Overall Fit' },
    { key: 'topic', label: 'Topic Overlap' },
    { key: 'methods', label: 'Methods Fit' },
    { key: 'trajectory', label: 'Trajectory' },
    { key: 'activity', label: 'Activity' },
    { key: 'network', label: 'Network' },
    { key: 'mentorship', label: 'Mentorship' },
    { key: 'careerAlignment', label: 'Career Alignment' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {professors.map(prof => {
          const match = matches.find(m => m.professorId === prof.id);
          if (!match) return null;
          return (
            <div key={prof.id} className="bg-card p-6 rounded-lg border border-border flex flex-col items-center text-center shadow-sm">
              <div className="bg-muted/40 rounded-lg p-2 border border-border/50 mb-4">
                <RadarChartComponent match={match} size={160} />
              </div>
              <h4 className="font-bold text-base">{prof.fullName}</h4>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{prof.institution}</p>
              <div className="mt-4 text-3xl font-extrabold text-accent leading-none">{match.overallScore}</div>
              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter mt-1">Overall Match</p>
              <p className="text-xs text-muted-foreground mt-3">{Math.round(match.confidence * 100)}% confidence</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border bg-muted/50">
              <TableHead className="w-48 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Dimension</TableHead>
              {professors.map(prof => (
                <TableHead key={prof.id} className="text-center font-bold text-sm text-foreground">{prof.fullName}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dimensions.map(dim => (
              <TableRow key={dim.key} className="border-border hover:bg-muted/30">
                <TableCell className="font-semibold text-xs text-muted-foreground">{dim.label}</TableCell>
                {professors.map(prof => {
                  const match = matches.find(m => m.professorId === prof.id);
                  const val = (dim.key === 'overallScore' ? match?.overallScore : (match?.subscores as any)?.[dim.key]) || 0;
                  return (
                    <TableCell key={prof.id} className="text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`text-xs font-bold ${Number(val) > 80 ? 'text-success' : Number(val) > 60 ? 'text-accent' : 'text-muted-foreground'}`}>
                          {val}%
                        </span>
                        <div className="w-24 h-1 bg-border rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${Number(val) > 80 ? 'bg-success' : Number(val) > 60 ? 'bg-accent' : 'bg-muted-foreground/30'}`}
                            style={{ width: `${val}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            <TableRow className="hover:bg-transparent border-none bg-muted/30">
              <TableCell className="font-semibold text-xs text-muted-foreground">Key Strength</TableCell>
              {professors.map(prof => {
                const match = matches.find(m => m.professorId === prof.id);
                const strengths = Object.entries(match?.subscores || {}).sort((a, b) => b[1] - a[1]);
                return (
                  <TableCell key={prof.id} className="text-center">
                    <Badge variant="outline" className="rounded-md bg-success/5 text-success border-success/20 text-[10px] font-bold uppercase tracking-tight">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> {strengths[0]?.[0] ?? 'n/a'}
                    </Badge>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
