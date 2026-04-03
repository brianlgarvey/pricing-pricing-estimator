import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";

interface ProjectInputProps {
  onSubmitDescription: (description: string) => void;
  onAutoSubmit?: (description: string, email: string) => void;
  isAnalyzing: boolean;
}

export function ProjectInput({ onSubmitDescription, onAutoSubmit, isAnalyzing }: ProjectInputProps) {
  const [description, setDescription] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlDescription = params.get("description");
    const urlEmail = params.get("email");
    if (urlDescription && urlEmail) {
      setDescription(urlDescription);
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(urlEmail);
      if (urlDescription.trim() && validEmail && onAutoSubmit) {
        onAutoSubmit(urlDescription.trim(), urlEmail.trim());
      }
    } else if (urlDescription) {
      setDescription(urlDescription);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = description.trim() && !isAnalyzing;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSubmitDescription(description.trim());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Describe Your Project</CardTitle>
        <CardDescription>
          Enter a description of your HubSpot project to get a price estimate
          based on similar historical projects.
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
