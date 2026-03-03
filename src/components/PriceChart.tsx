import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { SimilarMatch } from "@/lib/similarity";
import type { PriceEstimate } from "@/lib/priceCalculator";
import { formatCurrency, trimOutliers } from "@/lib/priceCalculator";
import { TrendingUp } from "lucide-react";

interface PriceChartProps {
  matches: SimilarMatch[];
  estimate: PriceEstimate;
}

export function PriceChart({ matches, estimate }: PriceChartProps) {
  const rawPrices = matches
    .map((m) => m.proposal.proposed_price)
    .sort((a, b) => a - b);
  const prices = trimOutliers(rawPrices);
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);

  const layout = useMemo(() => {
    if (prices.length < 3) return null;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    const padding = range * 0.06;
    const xMin = Math.max(0, min - padding);
    const xMax = max + padding;
    const totalRange = xMax - xMin;

    const toPercent = (price: number) =>
      ((price - xMin) / totalRange) * 100;

    // Bucket dots to stack vertically
    const bucketSize = totalRange / 50 || 1;
    const buckets = new Map<number, number>();
    const dots = prices.map((price) => {
      const bucket = Math.round(price / bucketSize);
      const count = buckets.get(bucket) || 0;
      buckets.set(bucket, count + 1);
      return { price, pct: toPercent(price), row: count };
    });

    const maxRow = Math.max(...dots.map((d) => d.row));

    return {
      toPercent,
      dots,
      maxRow,
      lowPct: toPercent(estimate.low),
      typicalPct: toPercent(estimate.typical),
      highPct: toPercent(estimate.high),
    };
  }, [prices, estimate]);

  if (!layout || prices.length < 3) return null;

  const { dots, maxRow, lowPct, typicalPct, highPct } = layout;
  const dotSize = 9;
  const dotGap = 12;
  const dotsHeight = Math.max((maxRow + 1) * dotGap, 32);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Price Distribution</CardTitle>
            <CardDescription>
              Each dot represents a real proposal from a similar project
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="relative mx-2">
          {/* === Dot strip section (bottom-aligned, grows upward) === */}
          <div className="relative" style={{ height: dotsHeight }}>
            {/* Subtle typical reference line through dots */}
            <div
              className="absolute top-0 bottom-0 w-px bg-[hsl(142,45%,42%)]/15"
              style={{ left: `${typicalPct}%` }}
            />

            {dots.map((dot, i) => (
              <div
                key={i}
                className="absolute -translate-x-1/2"
                style={{
                  left: `${dot.pct}%`,
                  bottom: dot.row * dotGap,
                }}
              >
                <div
                  className={`rounded-full transition-all duration-150 cursor-pointer
                    ${
                      hoveredDot === i
                        ? "bg-foreground scale-125 shadow-md"
                        : "bg-foreground/30 hover:bg-foreground/55"
                    }`}
                  style={{ width: dotSize, height: dotSize }}
                  onMouseEnter={() => setHoveredDot(i)}
                  onMouseLeave={() => setHoveredDot(null)}
                />
                {/* Tooltip */}
                {hoveredDot === i && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-foreground text-background text-[11px] font-medium whitespace-nowrap shadow-lg z-20">
                    {formatCurrency(dot.price, estimate.currency)}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* === Range bar (below the dots) === */}
          <div className="relative h-3 rounded-full bg-muted/50 mt-2">
            {/* Colored range fill */}
            <div
              className="absolute top-0 h-full rounded-full"
              style={{
                left: `${lowPct}%`,
                width: `${highPct - lowPct}%`,
                background:
                  "linear-gradient(90deg, hsl(142 40% 82%), hsl(142 45% 52%), hsl(142 40% 82%))",
              }}
            />
            {/* Low edge */}
            <div
              className="absolute top-0 h-full w-0.5 bg-white/80"
              style={{ left: `${lowPct}%` }}
            />
            {/* High edge */}
            <div
              className="absolute top-0 h-full w-0.5 bg-white/80"
              style={{ left: `${highPct}%` }}
            />
            {/* Typical marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-[2.5px] border-[hsl(142,45%,42%)] shadow-sm z-10"
              style={{ left: `${typicalPct}%` }}
            />
          </div>

          {/* === Labels below the bar === */}
          <div className="relative h-10 mt-1.5">
            {/* Low label */}
            <div
              className="absolute -translate-x-1/2 text-center"
              style={{ left: `${lowPct}%` }}
            >
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 block">
                Low
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                {formatCurrency(estimate.low, estimate.currency)}
              </span>
            </div>
            {/* Typical label */}
            <div
              className="absolute -translate-x-1/2 text-center"
              style={{ left: `${typicalPct}%` }}
            >
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[hsl(142,45%,35%)] block">
                Middle
              </span>
              <span className="text-xs font-semibold text-foreground">
                {formatCurrency(estimate.typical, estimate.currency)}
              </span>
            </div>
            {/* High label */}
            <div
              className="absolute -translate-x-1/2 text-center"
              style={{ left: `${highPct}%` }}
            >
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 block">
                High
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                {formatCurrency(estimate.high, estimate.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mt-3 pt-3 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-foreground/30" />
            <span className="text-[11px] text-muted-foreground">
              Proposals ({prices.length})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-2 rounded-full bg-gradient-to-r from-[hsl(142,40%,82%)] via-[hsl(142,45%,52%)] to-[hsl(142,40%,82%)]" />
            <span className="text-[11px] text-muted-foreground">
              Price range
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-white border-2 border-[hsl(142,45%,42%)]" />
            <span className="text-[11px] text-muted-foreground">
              Middle
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
