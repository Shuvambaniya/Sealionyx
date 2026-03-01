import { useState } from "react";
import { Upload, CheckCircle, XCircle, AlertTriangle, FileJson, User, Clock, Shield, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Separator } from "@/components/ui/separator";
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
  reason?: string;
}

export default function VerifyContent() {
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
    
    // Simulate verification delay
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Verify Content</h1>
        <p className="text-muted-foreground">
          Upload a sealed bundle to verify its authenticity and integrity.
        </p>
      </div>

      <div className="max-w-2xl">
        {!result ? (
          <div
            className={`security-card border-2 border-dashed transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                {isVerifying ? (
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileJson className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              
              <h3 className="text-lg font-medium mb-2">
                {isVerifying ? "Verifying..." : "Upload Bundle File"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {isVerifying
                  ? "Checking signatures and trust chain"
                  : "Drag and drop your bundle.json file here, or click to browse"}
              </p>
              
              {!isVerifying && (
                <Button onClick={handleFileSelect}>
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
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
                  <p className="text-sm text-muted-foreground">Overall result</p>
                  <h2 className="text-2xl font-semibold tracking-tight">
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
                <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                  {result.authenticity === "pass" && result.integrity === "pass" ? (
                    <CheckCircle className="h-6 w-6 text-success" />
                  ) : (
                    <XCircle className="h-6 w-6 text-destructive" />
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="security-card">
              <h3 className="font-semibold mb-4">Verification Details</h3>
              
              <div className="space-y-4">
                {/* Authenticity */}
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Authenticity</p>
                      <p className="text-sm text-muted-foreground">Signature verification</p>
                    </div>
                  </div>
                  {result.authenticity === "pass" ? (
                    <StatusBadge status="valid" label="Pass" />
                  ) : (
                    <StatusBadge status="error" label="Fail" />
                  )}
                </div>

                {/* Integrity */}
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Integrity</p>
                      <p className="text-sm text-muted-foreground">Content hash verification</p>
                    </div>
                  </div>
                  {result.integrity === "pass" ? (
                    <StatusBadge status="valid" label="Hash Match" />
                  ) : (
                    <StatusBadge status="error" label="Hash Mismatch" />
                  )}
                </div>

                {/* Trust Chain */}
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Link2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Trust Chain</p>
                      <p className="text-sm text-muted-foreground">Certificate authority validation</p>
                    </div>
                  </div>
                  {result.trustChain === "valid" ? (
                    <StatusBadge status="valid" label="Trusted" />
                  ) : (
                    <StatusBadge status="error" label="Untrusted" />
                  )}
                </div>

                {/* Revocation Status */}
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Revocation Status</p>
                      <p className="text-sm text-muted-foreground">Certificate validity check</p>
                    </div>
                  </div>
                  {result.revocationStatus === "not_revoked" ? (
                    <StatusBadge status="valid" label="Not Revoked" />
                  ) : (
                    <StatusBadge status="error" label="Revoked" />
                  )}
                </div>
              </div>
            </div>

            {/* Signer Information */}
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

              <Separator className="my-4" />

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-muted-foreground">Sealed At</label>
                  <p className="font-mono mt-1">{new Date(result.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">Content Hash</label>
                  <p className="font-mono mt-1 truncate">{result.contentHash}</p>
                </div>
              </div>
            </div>

            {/* Expandable cryptographic details */}
            <div className="security-card">
              <h3 className="font-semibold mb-2">Cryptographic Details</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Expand for signature, certificate chain, and hash inputs.
              </p>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="signature">
                  <AccordionTrigger>Digital Signature</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">Algorithm</p>
                      <code className="block rounded-md border border-border bg-muted/20 p-3 font-mono text-xs">
                        RSA-4096 • SHA-256
                      </code>
                      <p className="text-muted-foreground">Signature (truncated)</p>
                      <code className="block rounded-md border border-border bg-muted/20 p-3 font-mono text-xs">
                        MEUCIQDy... (base64)
                      </code>
                    </div>
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

                <AccordionItem value="hashes">
                  <AccordionTrigger>Hashes</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Content Hash (SHA-256)</p>
                      <code className="block rounded-md border border-border bg-muted/20 p-3 font-mono text-xs break-all">
                        {result.contentHash}
                      </code>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <Button variant="outline" onClick={handleReset}>
              Verify Another Bundle
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
