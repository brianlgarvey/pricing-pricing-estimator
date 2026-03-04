import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProjectInput } from "@/components/ProjectInput";
import { QualificationForm } from "@/components/QualificationForm";
import { PriceDisplay } from "@/components/PriceDisplay";
import { EstimateFeedback } from "@/components/EstimateFeedback";
import { SimilarProjectsList } from "@/components/SimilarProjectsList";
import { PriceChart } from "@/components/PriceChart";
import { loadProposals } from "@/lib/csvParser";
import { buildCorpus, findSimilar, type TfIdfCorpus, type SimilarMatch } from "@/lib/similarity";
import { analyzeScopeSignals } from "@/lib/scopeAnalyzer";
import { calculatePriceEstimate, type PriceEstimate } from "@/lib/priceCalculator";
import { Disclaimer, MatchCta } from "@/components/DisclaimerCta";
import { submitEstimate, updateSubmissionQualification, submitFeedback } from "@/lib/supabase";
import { Loader2, AlertCircle } from "lucide-react";

type AppState = "loading" | "ready" | "analyzing" | "qualifying" | "results" | "error";

export default function Index() {
  const [state, setState] = useState<AppState>("loading");
  const [error, setError] = useState<string>("");
  const corpusRef = useRef<TfIdfCorpus | null>(null);

  // Results
  const [matches, setMatches] = useState<SimilarMatch[]>([]);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const submissionIdPromiseRef = useRef<Promise<string | null>>(Promise.resolve(null));
  const [userEmail, setUserEmail] = useState<string>("");
  const [userDescription, setUserDescription] = useState<string>("");

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
          setUserEmail(email);
          setUserDescription(description);
          setState("qualifying");

          // Submit to Supabase — store the promise so qualification
          // handler can await the ID even if it hasn't resolved yet
          const idPromise = submitEstimate(email, description, estimate);
          submissionIdPromiseRef.current = idPromise;
          idPromise.then((id) => {
            if (id) setSubmissionId(id);
          });
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

  const handleQualificationSubmit = useCallback(
    async (jobTitle: string, expectedCost: string, companySize: string) => {
      setState("results");

      // Await the submission ID if it hasn't resolved yet
      const id = submissionId ?? (await submissionIdPromiseRef.current);
      if (id && priceEstimate) {
        updateSubmissionQualification(
          id,
          jobTitle,
          expectedCost,
          companySize,
          userEmail,
          userDescription,
          priceEstimate
        );
      }
    },
    [submissionId, priceEstimate, userEmail, userDescription]
  );

  const handleFeedbackSubmit = useCallback(
    async (rating: string) => {
      const id = submissionId ?? (await submissionIdPromiseRef.current);
      if (id) {
        submitFeedback(id, rating);
      }
    },
    [submissionId]
  );

  const handleReset = useCallback(() => {
    setMatches([]);
    setPriceEstimate(null);
    setSubmissionId(null);
    setUserEmail("");
    setUserDescription("");
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

        {state === "qualifying" && (
          <QualificationForm onSubmit={handleQualificationSubmit} />
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

            <EstimateFeedback onSubmit={handleFeedbackSubmit} />

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
