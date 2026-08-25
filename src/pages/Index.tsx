import { useState, useCallback, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProjectInput } from "@/components/ProjectInput";
import { EmailCaptureModal, type ContactInfo } from "@/components/EmailCaptureModal";
import { Turnstile, turnstileEnabled } from "@/components/Turnstile";
import { PriceDisplay } from "@/components/PriceDisplay";
import { EstimateFeedback } from "@/components/EstimateFeedback";
import { SimilarProjectsList } from "@/components/SimilarProjectsList";
import { PriceChart } from "@/components/PriceChart";
import { fetchEstimate, type PriceEstimate, type SimilarMatch } from "@/lib/api";
import { Disclaimer, MatchCta } from "@/components/DisclaimerCta";
import { PricingDrivers } from "@/components/PricingDrivers";
import { ProjectRecap } from "@/components/ProjectRecap";
import { AlertCircle } from "lucide-react";

type AppState =
  | "ready"
  | "email-capture"
  | "verifying"
  | "analyzing"
  | "results"
  | "error";

// How long to wait on the auto-submit verifying screen for a silently-stuck
// widget before giving up. The timer restarts whenever Turnstile enters an
// interactive challenge, so a visitor actively solving one is never cut off.
const AUTO_VERIFY_TIMEOUT_MS = 30000;

export default function Index() {
  const [state, setState] = useState<AppState>("ready");
  const [error, setError] = useState<string>("");

  // Pending description/email (captured before analysis runs)
  const [pendingDescription, setPendingDescription] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  // Guards for the auto-submit (RFP hand-off) flow, so the ProjectInput
  // remounting during "analyzing" cannot re-trigger it and the Turnstile
  // callback cannot start the analysis twice.
  const autoInitiatedRef = useRef(false);
  const autoVerifiedRef = useRef(false);
  // Bumped when the auto-submit challenge turns interactive, to restart the
  // stuck-widget timeout below.
  const [verifyTick, setVerifyTick] = useState(0);

  // Results
  const [matches, setMatches] = useState<SimilarMatch[]>([]);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);

  const runAnalysis = useCallback(
    async (
      description: string,
      email: string,
      firstName?: string,
      lastName?: string,
      turnstileToken?: string
    ) => {
      setState("analyzing");

      try {
        const result = await fetchEstimate(
          description,
          email,
          firstName,
          lastName,
          turnstileToken
        );
        setMatches(result.matches);
        setPriceEstimate(result.estimate);
        setState("results");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Analysis failed"
        );
        setState("error");
      }
    },
    []
  );

  // Called when user submits description (no email yet)
  const handleDescriptionSubmit = useCallback(
    (description: string) => {
      setPendingDescription(description);
      setState("email-capture");
    },
    []
  );

  // Called when URL has both description and email (auto-submit from RFP tool).
  // This path has no email-capture modal, so when Turnstile is enabled we still
  // need to obtain a token first (otherwise the edge function rejects the call
  // with 403). We show a short verifying step that renders the widget, then run
  // the analysis once it produces a token. Guarded so a ProjectInput remount
  // during "analyzing" does not re-enter this.
  const handleAutoSubmit = useCallback(
    (description: string, email: string) => {
      if (autoInitiatedRef.current) return;
      autoInitiatedRef.current = true;
      setPendingDescription(description);
      setPendingEmail(email);
      if (turnstileEnabled) {
        setState("verifying");
      } else {
        runAnalysis(description, email);
      }
    },
    [runAnalysis]
  );

  // Turnstile token arrived for the auto-submit flow.
  const handleAutoVerify = useCallback(
    (token: string) => {
      if (autoVerifiedRef.current) return;
      autoVerifiedRef.current = true;
      runAnalysis(pendingDescription, pendingEmail, undefined, undefined, token);
    },
    [pendingDescription, pendingEmail, runAnalysis]
  );

  // Turnstile errored (or its script was blocked) on the auto-submit flow.
  // Without this the "verifying" screen would hang indefinitely. Surface an
  // error; the error screen's "Reload page" re-triggers the hand-off cleanly.
  // Expiry is handled inside the widget (it refreshes the token), so only real
  // errors and the timeout below land here.
  const handleAutoVerifyFailure = useCallback(() => {
    if (autoVerifiedRef.current) return; // already proceeded
    setError(
      "We couldn't verify your request. Please reload the page and try again."
    );
    setState("error");
  }, []);

  // Restart the stuck-widget timeout when the challenge becomes interactive.
  const handleAutoInteractive = useCallback(() => setVerifyTick((t) => t + 1), []);

  // Safety net for the case where Turnstile renders but never resolves (e.g. its
  // script is blocked or a hostname mismatch shows an in-widget error without a
  // callback), which would otherwise leave the user stuck on the verifying
  // screen. Depends on verifyTick so an interactive challenge resets the clock.
  useEffect(() => {
    if (state !== "verifying") return;
    const timeout = setTimeout(() => {
      if (!autoVerifiedRef.current) handleAutoVerifyFailure();
    }, AUTO_VERIFY_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [state, verifyTick, handleAutoVerifyFailure]);

  // Called when user submits email in the modal
  const handleEmailSubmit = useCallback(
    (contact: ContactInfo) => {
      runAnalysis(
        pendingDescription,
        contact.email,
        contact.firstName,
        contact.lastName,
        contact.turnstileToken
      );
    },
    [pendingDescription, runAnalysis]
  );



  const handleReset = useCallback(() => {
    window.history.replaceState({}, "", window.location.pathname);
    setMatches([]);
    setPriceEstimate(null);
    setPendingDescription("");
    setPendingEmail("");
    autoInitiatedRef.current = false;
    autoVerifiedRef.current = false;
    setVerifyTick(0);
    setState("ready");
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex flex-1 flex-col mx-auto w-full max-w-5xl px-4 py-8">
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
            onSubmitDescription={handleDescriptionSubmit}
            onAutoSubmit={handleAutoSubmit}
            isAnalyzing={state === "analyzing"}
          />
        )}

        {state === "verifying" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24">
            <p className="text-muted-foreground text-sm">
              Verifying your request...
            </p>
            <Turnstile
              onVerify={handleAutoVerify}
              onError={handleAutoVerifyFailure}
              onInteractive={handleAutoInteractive}
            />
          </div>
        )}

        {state === "email-capture" && (
          <div className="relative">
            <div className="blur-sm brightness-[0.97] pointer-events-none select-none">
              <ProjectInput
                onSubmitDescription={() => {}}
                isAnalyzing={false}
              />
            </div>
            <EmailCaptureModal open={true} onSubmit={handleEmailSubmit} />
          </div>
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

            <ProjectRecap description={pendingDescription} />

            {matches.length >= 3 ? (
              <PriceChart matches={matches} estimate={priceEstimate} />
            ) : (
              <PriceDisplay estimate={priceEstimate} matches={matches} />
            )}

            <Disclaimer />

            <PricingDrivers />

            <EstimateFeedback />

            <SimilarProjectsList matches={matches} />

            <MatchCta />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
