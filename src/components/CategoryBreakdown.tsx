import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { CategoryPrice } from "@/lib/categoryPricing";
import { formatCurrency } from "@/lib/priceCalculator";
import { BarChart3 } from "lucide-react";

interface CategoryBreakdownProps {
  categories: CategoryPrice[];
  currency: string;
}

export function CategoryBreakdown({
  categories,
  currency,
}: CategoryBreakdownProps) {
  if (categories.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Category Breakdown</CardTitle>
            <CardDescription>
              Middle pricing by detected project categories
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {categories.map((cat) => {
            const maxPrice = Math.max(
              ...categories.map((c) => c.highRange)
            );
            const barWidth = (cat.highRange / maxPrice) * 100;

            return (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{cat.category}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(cat.lowRange, currency)}–
                    {formatCurrency(cat.highRange, currency)}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {cat.description}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
