import { useEffect, useRef } from "react";

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileAPI {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

// Turnstile is only active when a site key is configured. Without it the
// widget renders nothing and the app behaves as before (useful for local dev).
export const turnstileEnabled = Boolean(SITE_KEY);

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  // Fired when a previously issued token expires (before it was used).
  onExpire?: () => void;
  // Fired on a challenge error (network, blocked script, terminal failure).
  onError?: () => void;
  // Fired when the challenge enters interactive mode (the visitor is being
  // asked to act). Callers can use this to hold off any "stuck widget" timeout.
  onInteractive?: () => void;
}

export function Turnstile({
  onVerify,
  onExpire,
  onError,
  onInteractive,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          action: "estimate",
          // Let the widget auto-recover from transient errors and expiries
          // rather than stranding the user with a dead token.
          retry: "auto",
          "refresh-expired": "auto",
          callback: (token: string) => onVerify(token),
          // Signals the visitor is being asked to interact (e.g. a checkbox),
          // so callers can pause a stuck-widget timeout while they solve it.
          "before-interactive-callback": () => onInteractive?.(),
          // With refresh-expired: "auto" the widget re-runs the challenge and
          // fires the callback again with a fresh token; we just notify the
          // caller so it can drop the now-stale token in the meantime.
          "expired-callback": () => onExpire?.(),
          // Distinct from expiry: a real failure the caller should surface.
          "error-callback": () => {
            onError?.();
          },
        });
      })
      .catch(() => {
        // The script itself failed to load, so no challenge can run.
        if (!cancelled) onError?.();
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onVerify, onExpire, onError, onInteractive]);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} className="flex justify-center" />;
}
