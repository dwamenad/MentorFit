import React from 'react';
import { MatchResult } from '@/types';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';

export function RadarChartComponent({ match, size = 200 }: { match: MatchResult, size?: number }) {
  const data = [
    { subject: 'Topic', A: match.subscores.topic },
    { subject: 'Methods', A: match.subscores.methods },
    { subject: 'Trajectory', A: match.subscores.trajectory },
    { subject: 'Activity', A: match.subscores.activity },
    { subject: 'Network', A: match.subscores.network },
    { subject: 'Mentorship', A: match.subscores.mentorship },
    { subject: 'Career', A: match.subscores.careerAlignment },
  ];

  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'var(--muted-foreground)', fontSize: 8, fontWeight: 500 }}
          />
          <Radar
            name="Match"
            dataKey="A"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
