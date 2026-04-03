import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Search, Loader2, Paperclip } from "lucide-react";
import { extractTextFromFile } from "@/lib/extractText";

interface ProjectInputProps {
  onSubmitDescription: (description: string) => void;
  onAutoSubmit?: (description: string, email: string) => void;
  isAnalyzing: boolean;
}

export function ProjectInput({ onSubmitDescription, onAutoSubmit, isAnalyzing }: ProjectInputProps) {
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const canSubmit = description.trim() && !isAnalyzing && !isUploading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSubmitDescription(description.trim());
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setIsUploading(true);
    try {
      const text = await extractTextFromFile(file);
      if (text.trim()) {
        setDescription(text.trim());
      } else {
        setUploadError("Could not extract text from this file. Please try a different format.");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center -mt-24">
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-semibold tracking-tight">Get a Price Estimate</h2>
        <p className="mt-4 text-muted-foreground">
          Enter a description of your HubSpot project to get a price estimate based on similar historical projects.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-[650px] space-y-4">
        <Textarea
          id="description"
          placeholder="e.g., We need to set up HubSpot Marketing Hub Professional with custom workflows, lead scoring, and integration with our existing Salesforce CRM..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[200px] resize-y text-[15px]"
          disabled={isAnalyzing || isUploading}
        />

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
      <div className="mt-3 flex flex-col items-center gap-1.5">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isAnalyzing}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Extracting text...
            </>
          ) : (
            <>
              <Paperclip className="h-3 w-3" />
              or upload a document (PDF, Word, or text)
            </>
          )}
        </button>
        {uploadError && (
          <p className="text-xs text-red-500">{uploadError}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}
