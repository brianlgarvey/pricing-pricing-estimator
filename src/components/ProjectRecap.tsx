import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

const TRUNCATE_AT = 250;

interface ProjectRecapProps {
  description: string;
}

export function ProjectRecap({ description }: ProjectRecapProps) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = description.trim();
  if (!trimmed) return null;

  const isLong = trimmed.length > TRUNCATE_AT;
  const visible =
    !expanded && isLong
      ? trimmed.slice(0, TRUNCATE_AT).trimEnd() + "…"
      : trimmed;

  return (
    <Card className="bg-secondary/30">
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-3">
          <Quote className="w-4 h-4 text-muted-foreground shrink-0 -scale-x-100 -scale-y-100" />
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">
              Your project
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {visible}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded((x) => !x)}
                className="text-xs text-primary hover:underline mt-2 font-medium"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
