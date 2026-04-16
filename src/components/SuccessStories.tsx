import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Quote, User, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { SuccessStory } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { readStored, STORAGE_KEYS, writeStored } from '@/lib/persistence';

const INITIAL_STORIES: SuccessStory[] = [
  {
    id: '1',
    author: 'Anonymous',
    field: 'Neuroscience',
    story: 'I was struggling to find a mentor who used both fMRI and computational modeling. MentorFit helped me identify three professors I had completely overlooked in my initial search.',
    outcome: 'Accepted into my top choice lab with a much stronger research fit.',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    author: 'Anonymous',
    field: 'Public Policy',
    story: 'The trajectory view made it clear that one of my early targets was shifting away from the questions I cared about most. That saved me weeks of chasing the wrong lab.',
    outcome: 'Found a rising mentor whose current work aligned directly with my statement of purpose.',
    createdAt: new Date().toISOString(),
  },
];

export function SuccessStories() {
  const [stories, setStories] = useState<SuccessStory[]>(() => readStored(STORAGE_KEYS.stories, INITIAL_STORIES));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newStory, setNewStory] = useState({
    field: '',
    story: '',
    outcome: '',
  });

  useEffect(() => {
    writeStored(STORAGE_KEYS.stories, stories);
  }, [stories]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const story: SuccessStory = {
      id: crypto.randomUUID(),
      author: 'Anonymous',
      field: newStory.field,
      story: newStory.story,
      outcome: newStory.outcome,
      createdAt: new Date().toISOString(),
    };

    setStories((current) => [story, ...current]);
    setNewStory({ field: '', story: '', outcome: '' });
    setIsFormOpen(false);
    toast.success('Thank you for sharing your success story.');
  };

  return (
    <section className="py-24 bg-muted/50 border-y border-border mt-24 rounded-[2rem]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 bg-accent/5 text-accent border-accent/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              Community Impact
            </Badge>
            <h2 className="text-4xl font-bold tracking-tight mb-4">Student Success Stories</h2>
            <p className="text-muted-foreground text-lg">
              See how MentorFit helps students pressure-test potential advisor choices before they commit to outreach and applications.
            </p>
          </div>
          <Button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-md px-6"
          >
            {isFormOpen ? 'Cancel' : 'Share Your Story'}
          </Button>
        </div>

        <AnimatePresence>
          {isFormOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-10 overflow-hidden"
            >
              <Card className="border-border shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Share your outcome</h3>
                      <p className="text-muted-foreground text-sm">Stories stay local to this browser in the no-login build.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold">Field</label>
                        <Input
                          placeholder="e.g. Neuroscience"
                          required
                          value={newStory.field}
                          onChange={(event) => setNewStory({ ...newStory, field: event.target.value })}
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold">The Outcome</label>
                        <Input
                          placeholder="e.g. Found a better-fitting advisor"
                          required
                          value={newStory.outcome}
                          onChange={(event) => setNewStory({ ...newStory, outcome: event.target.value })}
                          className="bg-background"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold">Your Experience</label>
                      <Textarea
                        placeholder="How did MentorFit change your shortlist or outreach strategy?"
                        required
                        className="min-h-[120px] bg-background"
                        value={newStory.story}
                        onChange={(event) => setNewStory({ ...newStory, story: event.target.value })}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <User className="w-3 h-3" /> Stories are anonymous and stored locally in this build.
                      </p>
                      <Button type="submit" className="bg-primary text-primary-foreground font-bold px-8">
                        Submit Story <Send className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
            >
              <Card className="h-full border-border hover:border-accent/30 transition-all hover:shadow-lg group">
                <CardContent className="p-8 flex flex-col h-full">
                  <div className="mb-6 flex justify-between items-start">
                    <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                      <Quote className="w-5 h-5" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tight">
                      {story.field}
                    </Badge>
                  </div>

                  <p className="text-foreground leading-relaxed italic mb-8 flex-1">
                    "{story.story}"
                  </p>

                  <div className="pt-6 border-t border-border mt-auto">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-bold leading-none">{story.author}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(story.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="bg-success/10 border border-success/20 rounded-md p-3 mt-4 flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-success mb-1">Outcome</p>
                        <p className="text-xs font-medium text-foreground leading-tight">{story.outcome}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
