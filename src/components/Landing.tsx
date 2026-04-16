import React from 'react';
import { GraduationCap, Search, BarChart3, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from "@/components/ui/button";
import { SuccessStories } from './SuccessStories';
import { ThemeToggle } from './ThemeToggle';

export function Landing({ onStart, hasSavedProfile }: { onStart: () => void; hasSavedProfile: boolean }) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <header className="flex justify-between items-center mb-24">
        <div className="flex items-center gap-2 font-serif italic text-2xl">
          <GraduationCap className="w-8 h-8 text-accent" />
          <span>MentorFit</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-8"
          >
            Find your ideal <br />
            <span className="text-accent">PhD Mentor.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground mb-10 max-w-lg leading-relaxed"
          >
            A deterministic decision-support workspace for evaluating potential advisors based on research overlap, methods fit, and where a lab appears to be heading next.
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
              className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-md px-8 py-6 text-lg font-bold"
            >
              {hasSavedProfile ? 'Continue workspace' : 'Build your profile'}
            </Button>
            <p className="text-sm text-muted-foreground max-w-xs">
              No login required. MentorFit saves your profile and shortlist in this browser.
            </p>
          </motion.div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.16),transparent_50%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.14),transparent_50%)] rounded-[2rem] blur-3xl opacity-90" />
          <div className="grid grid-cols-2 gap-4">
            <FeatureCard
              icon={<Search className="w-6 h-6" />}
              title="Link Ingestion"
              desc="Paste Scholar, ORCID, lab, or faculty links and we derive a structured research profile without LLM calls."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Fit Scoring"
              desc="Transparent scoring across topic overlap, methods, trajectory, activity, network, and mentorship signals."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Comparison"
              desc="Compare up to four advisors side-by-side with the same scoring rubric and confidence markers."
            />
            <FeatureCard
              icon={<GraduationCap className="w-6 h-6" />}
              title="Trajectory"
              desc="See where a research program appears strongest and where you still need manual verification."
            />
          </div>
        </div>
      </main>

      <section className="mt-32 border-t border-border pt-20">
        <div className="grid md:grid-cols-3 gap-12">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-4 block">Step 01</span>
            <h3 className="text-2xl font-bold mb-4">Define Interests</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Tell MentorFit what you want to study, how you like to work, and which dimensions matter most to your eventual advisor fit.</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-4 block">Step 02</span>
            <h3 className="text-2xl font-bold mb-4">Add Professors</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Paste public profile links. We fetch lightweight metadata, infer the research track, and build a structured mentor record locally.</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-4 block">Step 03</span>
            <h3 className="text-2xl font-bold mb-4">Compare & Decide</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Rank your shortlist, inspect the radar chart, and look at confidence and limitation notes before making outreach decisions.</p>
          </div>
        </div>
      </section>

      <SuccessStories />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-card/90 backdrop-blur-sm p-8 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center text-accent mb-6">
        {icon}
      </div>
      <h4 className="text-xl font-bold mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
