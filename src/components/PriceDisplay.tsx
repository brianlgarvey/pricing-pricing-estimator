import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PriceEstimate } from "@/lib/priceCalculator";
import { formatCurrency } from "@/lib/priceCalculator";
import type { SimilarMatch } from "@/lib/similarity";
import { TrendingUp, TrendingDown, Target } from "lucide-react";

interface PriceDisplayProps {
  estimate: PriceEstimate;
  matches?: SimilarMatch[];
}

export function PriceDisplay({ estimate, matches }: PriceDisplayProps) {
  const confidenceColors = {
    low: "bg-amber-100 text-amber-800 border-amber-200",
    medium: "bg-blue-100 text-blue-800 border-blue-200",
    high: "bg-green-100 text-green-800 border-green-200",
  };

  const confidenceLabels = {
    low: "Low Confidence",
    medium: "Medium Confidence",
    high: "High Confidence",
  };

  // Compute actual min/max from all matched projects
  const prices = matches
    ?.map((m) => m.proposal.proposed_price)
    .filter((p) => p > 0) ?? [];
  const lowPrice = prices.length > 0 ? Math.min(...prices) : estimate.low;
  const highPrice = prices.length > 0 ? Math.max(...prices) : estimate.high;

  // Average of top 10 most similar projects (matches are sorted by similarity desc)
  const top10Prices = matches
    ?.slice(0, 10)
    .map((m) => m.proposal.proposed_price)
    .filter((p) => p > 0) ?? [];
  const avgTop10 = top10Prices.length > 0
    ? Math.round(top10Prices.reduce((sum, p) => sum + p, 0) / top10Prices.length)
    : estimate.typical;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Price Estimate</CardTitle>
            <CardDescription>
              Based on {estimate.matchCount} similar projects
            </CardDescription>
          </div>
          <Badge className={confidenceColors[estimate.confidence]} variant="outline">
            {confidenceLabels[estimate.confidence]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-secondary/50">
            <TrendingDown className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Low End
            </p>
            <p className="text-xl font-bold mt-1">
              {formatCurrency(lowPrice, estimate.currency)}
            </p>
          </div>

          <div className="text-center p-4 rounded-lg bg-primary/5 border-2 border-primary/20">
            <Target className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-xs text-primary font-medium uppercase tracking-wide">
              Estimated Price
            </p>
            <p className="text-2xl font-bold mt-1 text-primary">
              {formatCurrency(avgTop10, estimate.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              Avg. of top {Math.min(top10Prices.length, 10)} similar projects
            </p>
          </div>

          <div className="text-center p-4 rounded-lg bg-secondary/50">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              High End
            </p>
            <p className="text-xl font-bold mt-1">
              {formatCurrency(highPrice, estimate.currency)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
