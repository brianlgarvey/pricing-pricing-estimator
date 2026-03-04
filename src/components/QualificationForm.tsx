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

const COMPANY_SIZE_OPTIONS = [
  { value: "", label: "Select company size..." },
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-1000", label: "201–1,000 employees" },
  { value: "1001-5000", label: "1,001–5,000 employees" },
  { value: "5000+", label: "5,000+ employees" },
];

interface QualificationFormProps {
  onSubmit: (jobTitle: string, expectedCost: string, companySize: string) => void;
}

export function QualificationForm({ onSubmit }: QualificationFormProps) {
  const [jobTitle, setJobTitle] = useState("");
  const [expectedCost, setExpectedCost] = useState("");
  const [companySize, setCompanySize] = useState("");

  const canSubmit =
    jobTitle.trim().length > 0 &&
    expectedCost.trim().length > 0 &&
    companySize.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSubmit(jobTitle.trim(), expectedCost.trim(), companySize);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Almost there!</CardTitle>
        <CardDescription>
          Help us calibrate — tell us a bit about yourself and your initial
          expectations. Your answers here won't impact your results and are for
          reference purposes only.
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
            <Label htmlFor="companySize">Company Size</Label>
            <select
              id="companySize"
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              {COMPANY_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.value === ""}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedCost">
              What's your expectation or best guess for how much this project
              should cost?
            </Label>
            <p className="text-xs text-muted-foreground">
              Your answer is for reference purposes only. It won't impact your
              results whatsoever.
            </p>
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
