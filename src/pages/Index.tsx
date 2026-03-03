import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProjectInput } from "@/components/ProjectInput";
import { PriceDisplay } from "@/components/PriceDisplay";
import { SimilarProjectsList } from "@/components/SimilarProjectsList";
import { PriceChart } from "@/components/PriceChart";
import { loadProposals } from "@/lib/csvParser";
import { buildCorpus, findSimilar, type TfIdfCorpus, type SimilarMatch } from "@/lib/similarity";
import { analyzeScopeSignals } from "@/lib/scopeAnalyzer";
import { calculatePriceEstimate, type PriceEstimate } from "@/lib/priceCalculator";
import { Disclaimer, MatchCta } from "@/components/DisclaimerCta";
import { submitEstimate } from "@/lib/supabase";
import { Loader2, AlertCircle } from "lucide-react";

type AppState = "loading" | "ready" | "analyzing" | "results" | "error";

export default function Index() {
  const [state, setState] = useState<AppState>("loading");
  const [error, setError] = useState<string>("");
  const corpusRef = useRef<TfIdfCorpus | null>(null);

  // Results
  const [matches, setMatches] = useState<SimilarMatch[]>([]);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const proposals = await loadProposals();
        const corpus = buildCorpus(proposals);
        corpusRef.current = corpus;
        setState("ready");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load proposal data"
        );
        setState("error");
      }
    }
    init();
  }, []);

  const handleAnalyze = useCallback(
    (description: string, email: string) => {
      if (!corpusRef.current) return;

      setState("analyzing");

      // Use setTimeout to allow UI to update before heavy computation
      setTimeout(() => {
        try {
          const corpus = corpusRef.current!;

          // Find similar projects
          const similar = findSimilar(description, corpus);

          // Analyze scope
          const scope = analyzeScopeSignals(description);

          // Calculate price estimate
          const estimate = calculatePriceEstimate(similar, scope);

          setMatches(similar);
          setPriceEstimate(estimate);
          setState("results");

          // Submit to Supabase + send email notification (fire and forget)
          submitEstimate(email, description, estimate);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Analysis failed"
          );
          setState("error");
        }
      }, 50);
    },
    []
  );

  const handleReset = useCallback(() => {
    setMatches([]);
    setPriceEstimate(null);
    setState("ready");
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">
        {state === "loading" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">
              Loading proposal data and building similarity index...
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-destructive font-medium">Error</p>
            <p className="text-muted-foreground text-sm max-w-md text-center">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-primary underline hover:no-underline"
            >
              Reload page
            </button>
          </div>
        )}

        {(state === "ready" || state === "analyzing") && (
          <ProjectInput
            onAnalyze={handleAnalyze}
            isAnalyzing={state === "analyzing"}
          />
        )}

        {state === "results" && priceEstimate && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Analysis Results</h2>
              <button
                onClick={handleReset}
                className="text-sm text-primary hover:underline"
              >
                New estimate
              </button>
            </div>

            <PriceDisplay estimate={priceEstimate} />

            <Disclaimer />

            {matches.length >= 3 && (
              <PriceChart matches={matches} estimate={priceEstimate} />
            )}

            <MatchCta />

            <SimilarProjectsList matches={matches} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
