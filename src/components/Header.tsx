import { Calculator } from "lucide-react";

export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            Project Pricing Estimator
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 uppercase tracking-wider">
              Beta
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            HubSpot project cost estimates based on 1,155 historical projects and proposals
          </p>
        </div>
      </div>
    </header>
  );
}
