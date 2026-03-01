import { useState } from "react";
import { FileSignature, Upload, FileText, CheckCircle, Download, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

export default function SealContent() {
  const [content, setContent] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [contentType, setContentType] = useState("");
  const [promptHash, setPromptHash] = useState("");
  const [isSealed, setIsSealed] = useState(false);
  const [bundleId, setBundleId] = useState("");

  const handleSeal = () => {
    if (!content || !aiModel || !contentType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Simulate sealing process
    const generatedBundleId = `seal_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
    setBundleId(generatedBundleId);
    setIsSealed(true);
    
    toast({
      title: "Content Sealed Successfully",
      description: "Your AI content has been cryptographically signed.",
    });
  };

  const handleReset = () => {
    setContent("");
    setAiModel("");
    setContentType("");
    setPromptHash("");
    setIsSealed(false);
    setBundleId("");
  };

  const copyBundleId = () => {
    navigator.clipboard.writeText(bundleId);
    toast({
      title: "Copied",
      description: "Bundle ID copied to clipboard.",
    });
  };

  if (isSealed) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">Content Sealed</h1>
          <p className="text-muted-foreground">
            Your AI-generated content has been cryptographically sealed.
          </p>
        </div>

        <div className="max-w-3xl">
          <div className="security-card">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Sealing Complete</h2>
                <p className="text-sm text-muted-foreground">Your content is now verifiable</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bundle ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm font-mono bg-muted px-3 py-2 rounded flex-1 truncate">
                    {bundleId}
                  </code>
                  <Button variant="ghost" size="icon" onClick={copyBundleId}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">AI Model</label>
                  <p className="mt-1">{aiModel}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Content Type</label>
                  <p className="mt-1">{contentType}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Content Hash (SHA-256)</label>
                <code className="block text-sm font-mono bg-muted px-3 py-2 rounded mt-1 truncate">
                  3f7a9c2b1e4d5a6f8c9b0e1d2a3f4c5d6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c
                </code>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Bundle Hash</label>
                <code className="block text-sm font-mono bg-muted px-3 py-2 rounded mt-1 truncate">
                  b1c0f1a8d2e4... (bundle digest)
                </code>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                <p className="mt-1">{new Date().toISOString()}</p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex flex-wrap gap-3">
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Download Bundle
              </Button>
              <Button variant="outline" asChild>
                <a href="/dashboard/verify">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Verify Now
                </a>
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                Seal Another
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Seal AI Content</h1>
        <p className="text-muted-foreground">
          Cryptographically sign your AI-generated content to prove authenticity and integrity.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Content input */}
        <div className="security-card">
          <Label htmlFor="content" className="text-sm font-medium">
            AI-Generated Content <span className="text-destructive">*</span>
          </Label>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Paste content or upload a file.
          </p>
          <Textarea
            id="content"
            placeholder="Paste your AI-generated content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[360px] font-mono text-sm"
          />
          <div className="mt-3 flex items-center justify-between">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
            <p className="text-xs text-muted-foreground">Max 10MB • .txt, .md, .json</p>
          </div>
        </div>

        {/* Right: Metadata + action */}
        <div className="security-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Metadata</h3>
            <p className="text-xs text-muted-foreground">Required fields marked *</p>
          </div>

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="aiModel" className="text-sm font-medium">
                  AI Model <span className="text-destructive">*</span>
                </Label>
                <Select value={aiModel} onValueChange={setAiModel}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="claude-3">Claude 3</SelectItem>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                    <SelectItem value="llama-2">Llama 2</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="contentType" className="text-sm font-medium">
                  Content Type <span className="text-destructive">*</span>
                </Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="creative">Creative Writing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="promptHash" className="text-sm font-medium">
                Prompt Hash <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1 mb-2">
                Hash of the original prompt for additional provenance.
              </p>
              <Input
                id="promptHash"
                placeholder="SHA-256 hash of the original prompt"
                value={promptHash}
                onChange={(e) => setPromptHash(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Signed with your active certificate</p>
              <Button onClick={handleSeal} size="lg">
                <FileSignature className="h-4 w-4 mr-2" />
                Seal Content
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
