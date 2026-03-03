import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { SimilarMatch } from "@/lib/similarity";
import { formatCurrency } from "@/lib/priceCalculator";
import { FileText } from "lucide-react";

interface SimilarProjectsListProps {
  matches: SimilarMatch[];
  maxDisplay?: number;
}

export function SimilarProjectsList({
  matches,
  maxDisplay = 10,
}: SimilarProjectsListProps) {
  // Deduplicate by job_id — show only the highest-similarity proposal per job
  const seenJobs = new Set<number>();
  const uniqueMatches: SimilarMatch[] = [];
  for (const match of matches) {
    if (!seenJobs.has(match.proposal.job_id)) {
      seenJobs.add(match.proposal.job_id);
      uniqueMatches.push(match);
    }
    if (uniqueMatches.length >= maxDisplay) break;
  }
  const displayed = uniqueMatches;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Similar Projects</CardTitle>
            <CardDescription>
              Top {displayed.length} most similar historical proposals
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 pb-2 border-b text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">
          <span>Project</span>
          <span className="w-20 text-right">Price</span>
          <span className="w-16 text-right">Match</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/50">
          {displayed.map((match, i) => (
            <div
              key={match.proposal.proposal_id}
              className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-3 py-2.5 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs tabular-nums text-muted-foreground/60 w-5 shrink-0 text-right">
                  {i + 1}
                </span>
                <span className="text-sm truncate">
                  {match.proposal.job_title}
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums w-20 text-right">
                {formatCurrency(
                  match.proposal.proposed_price,
                  match.proposal.currency
                )}
              </span>
              <div className="w-16 text-right">
                <span className="inline-block text-xs tabular-nums text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                  {Math.round(match.similarity * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
