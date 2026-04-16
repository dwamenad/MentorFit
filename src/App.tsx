import { Landing } from './components/Landing';

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/15">
      <Landing onStart={() => {}} hasSavedProfile={false} />
    </div>
  );
}
