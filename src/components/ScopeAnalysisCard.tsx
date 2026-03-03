import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ScopeAnalysis } from "@/lib/scopeAnalyzer";
import { Shield, Layers, ArrowRightLeft, Code, Zap, Building2 } from "lucide-react";

interface ScopeAnalysisCardProps {
  analysis: ScopeAnalysis;
}

const categoryIcons: Record<string, React.ReactNode> = {
  Hub: <Layers className="w-3.5 h-3.5" />,
  "Multi-Hub": <Layers className="w-3.5 h-3.5" />,
  Integration: <ArrowRightLeft className="w-3.5 h-3.5" />,
  Migration: <ArrowRightLeft className="w-3.5 h-3.5" />,
  "Custom Development": <Code className="w-3.5 h-3.5" />,
  Enterprise: <Building2 className="w-3.5 h-3.5" />,
};

const categoryColors: Record<string, string> = {
  Hub: "bg-blue-100 text-blue-700 border-blue-200",
  "Multi-Hub": "bg-purple-100 text-purple-700 border-purple-200",
  Integration: "bg-orange-100 text-orange-700 border-orange-200",
  Migration: "bg-red-100 text-red-700 border-red-200",
  "Custom Development": "bg-indigo-100 text-indigo-700 border-indigo-200",
  Enterprise: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const levelColors: Record<string, string> = {
  Low: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  High: "bg-orange-100 text-orange-800",
  "Very High": "bg-red-100 text-red-800",
};

export function ScopeAnalysisCard({ analysis }: ScopeAnalysisCardProps) {
  const progressValue = Math.min((analysis.complexityScore / 20) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Scope Analysis</CardTitle>
              <CardDescription>
                Detected complexity signals from your description
              </CardDescription>
            </div>
          </div>
          <Badge className={levelColors[analysis.complexityLevel]} variant="outline">
            {analysis.complexityLevel} Complexity
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Complexity Score</span>
            <span className="font-medium">
              {analysis.complexityScore} pts ({analysis.scopeMultiplier}x
              multiplier)
            </span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        {analysis.signals.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Detected Signals</p>
            <div className="flex flex-wrap gap-2">
              {analysis.signals.map((signal, i) => (
                <div
                  key={i}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                    categoryColors[signal.category] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {categoryIcons[signal.category] || (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  {signal.signal}
                  <span className="opacity-60">+{signal.weight}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No specific complexity signals detected. Base pricing applies.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
