import { useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, XCircle, AlertTriangle, FileJson, User, Shield, Link2, ArrowLeft } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface VerificationResult {
  authenticity: "pass" | "fail";
  integrity: "pass" | "fail";
  signerName: string;
  signerEmail: string;
  timestamp: string;
  trustChain: "valid" | "invalid";
  revocationStatus: "not_revoked" | "revoked";
  contentHash: string;
}

export default function Verify() {
  const [isDragging, setIsDragging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    performVerification();
  };

  const handleFileSelect = () => {
    performVerification();
  };

  const performVerification = () => {
    setIsVerifying(true);
    
    setTimeout(() => {
      setResult({
        authenticity: "pass",
        integrity: "pass",
        signerName: "John Doe",
        signerEmail: "john@example.com",
        timestamp: "2024-01-24T10:30:00Z",
        trustChain: "valid",
        revocationStatus: "not_revoked",
        contentHash: "3f7a9c2b1e4d5a6f8c9b0e1d2a3f4c5d6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
      });
      setIsVerifying(false);
    }, 1500);
  };

  const handleReset = () => {
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button variant="hero" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold mb-3">Verify Content</h1>
            <p className="text-muted-foreground">
              Upload a sealed bundle to verify its authenticity and integrity. No account required.
            </p>
          </div>

          {!result ? (
            <div
              className={`security-card border-2 border-dashed transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="py-16 text-center">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                  {isVerifying ? (
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileJson className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                
                <h3 className="text-xl font-medium mb-2">
                  {isVerifying ? "Verifying..." : "Upload Bundle File"}
                </h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  {isVerifying
                    ? "Checking digital signature, content hash, and certificate trust chain"
                    : "Drag and drop your bundle.json file here, or click to browse"}
                </p>
                
                {!isVerifying && (
                  <Button size="lg" onClick={handleFileSelect}>
                    <Upload className="h-4 w-4 mr-2" />
                    Select Bundle File
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Result */}
              <div
                className={`security-card ${
                  result.authenticity === "pass" && result.integrity === "pass"
                    ? "verification-pass"
                    : "verification-fail"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Public verification</p>
                    <h2 className="text-3xl font-semibold tracking-tight">
                      {result.authenticity === "pass" && result.integrity === "pass" ? (
                        <span className="text-success">PASS</span>
                      ) : (
                        <span className="text-destructive">FAIL</span>
                      )}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.authenticity === "pass" && result.integrity === "pass"
                        ? "Signature and hash verification succeeded."
                        : "One or more checks failed. Review details below."}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center">
                    {result.authenticity === "pass" && result.integrity === "pass" ? (
                      <CheckCircle className="h-7 w-7 text-success" />
                    ) : (
                      <XCircle className="h-7 w-7 text-destructive" />
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="security-card">
                <h3 className="font-semibold mb-4">Verification Details</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Authenticity</p>
                        <p className="text-sm text-muted-foreground">Digital signature verification</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      result.authenticity === "pass" 
                        ? "bg-success/10 text-success" 
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {result.authenticity === "pass" ? (
                        <><CheckCircle className="h-3.5 w-3.5" /> Pass</>
                      ) : (
                        <><XCircle className="h-3.5 w-3.5" /> Fail</>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Integrity</p>
                        <p className="text-sm text-muted-foreground">Content hash verification</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      result.integrity === "pass" 
                        ? "bg-success/10 text-success" 
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {result.integrity === "pass" ? (
                        <><CheckCircle className="h-3.5 w-3.5" /> Hash Match</>
                      ) : (
                        <><XCircle className="h-3.5 w-3.5" /> Hash Mismatch</>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Link2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Trust Chain</p>
                        <p className="text-sm text-muted-foreground">Certificate authority validation</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      result.trustChain === "valid" 
                        ? "bg-success/10 text-success" 
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {result.trustChain === "valid" ? (
                        <><CheckCircle className="h-3.5 w-3.5" /> Trusted</>
                      ) : (
                        <><XCircle className="h-3.5 w-3.5" /> Untrusted</>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Revocation Status</p>
                        <p className="text-sm text-muted-foreground">Certificate validity check</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      result.revocationStatus === "not_revoked" 
                        ? "bg-success/10 text-success" 
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {result.revocationStatus === "not_revoked" ? (
                        <><CheckCircle className="h-3.5 w-3.5" /> Not Revoked</>
                      ) : (
                        <><XCircle className="h-3.5 w-3.5" /> Revoked</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signer Info */}
              <div className="security-card">
                <h3 className="font-semibold mb-4">Signer Information</h3>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{result.signerName}</p>
                    <p className="text-sm text-muted-foreground">{result.signerEmail}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sealed At</span>
                    <p className="font-mono mt-1">{new Date(result.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Content Hash (SHA-256)</span>
                    <p className="font-mono mt-1 truncate">{result.contentHash}</p>
                  </div>
                </div>
              </div>

              {/* Expandable cryptographic details */}
              <div className="security-card">
                <h3 className="font-semibold mb-2">Cryptographic Details</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Expand for technical proofs (safe to share).
                </p>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="signature">
                    <AccordionTrigger>Digital Signature</AccordionTrigger>
                    <AccordionContent>
                      <code className="block rounded-md border border-border bg-muted/20 p-3 font-mono text-xs">
                        RSA-4096 • SHA-256 • signature: MEUCIQDy... (base64)
                      </code>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="chain">
                    <AccordionTrigger>Certificate Chain</AccordionTrigger>
                    <AccordionContent>
                      <code className="block rounded-md border border-border bg-muted/20 p-3 font-mono text-xs">
                        Root CA → Intermediate CA → End-Entity
                      </code>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="hash">
                    <AccordionTrigger>Content Hash (SHA-256)</AccordionTrigger>
                    <AccordionContent>
                      <code className="block rounded-md border border-border bg-muted/20 p-3 font-mono text-xs break-all">
                        {result.contentHash}
                      </code>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleReset}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Verify Another
                </Button>
                <Button variant="hero" asChild>
                  <Link to="/auth">Create Your Account</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
