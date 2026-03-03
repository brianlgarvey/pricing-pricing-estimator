import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";

interface ProjectInputProps {
  onAnalyze: (description: string, email: string) => void;
  isAnalyzing: boolean;
}

export function ProjectInput({ onAnalyze, isAnalyzing }: ProjectInputProps) {
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = description.trim() && isValidEmail && !isAnalyzing;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onAnalyze(description.trim(), email.trim());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Describe Your Project</CardTitle>
        <CardDescription>
          Enter a description of your HubSpot project to get a price estimate
          based on similar historical proposals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Project Description</Label>
            <Textarea
              id="description"
              placeholder="e.g., We need to set up HubSpot Marketing Hub Professional with custom workflows, lead scoring, and integration with our existing Salesforce CRM..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] resize-y"
              disabled={isAnalyzing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isAnalyzing}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Get Price Estimate
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
