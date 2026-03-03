import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface QualificationFormProps {
  onSubmit: (jobTitle: string, expectedCost: string) => void;
}

export function QualificationForm({ onSubmit }: QualificationFormProps) {
  const [jobTitle, setJobTitle] = useState("");
  const [expectedCost, setExpectedCost] = useState("");

  const canSubmit = jobTitle.trim().length > 0 && expectedCost.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSubmit(jobTitle.trim(), expectedCost.trim());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Almost there!</CardTitle>
        <CardDescription>
          Help us calibrate — tell us a bit about yourself and what you expect to
          spend.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Your Job Title</Label>
            <input
              id="jobTitle"
              type="text"
              placeholder="e.g., Marketing Director"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedCost">
              What do you expect this project to cost?
            </Label>
            <input
              id="expectedCost"
              type="text"
              placeholder="e.g., $5,000"
              value={expectedCost}
              onChange={(e) => setExpectedCost(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full"
            size="lg"
          >
            See My Estimate
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
