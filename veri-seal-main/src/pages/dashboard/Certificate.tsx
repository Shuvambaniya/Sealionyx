import { Award, Download, Copy, AlertTriangle, CheckCircle } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

const certificateData = {
  commonName: "John Doe",
  email: "john@example.com",
  serialNumber: "7A:3F:2B:91:C4:E8:5D:F6:1A:2C:3B:4D:5E:6F:7A:8B",
  issuer: "Sealionyx Certificate Authority",
  validFrom: "January 24, 2024",
  validTo: "January 24, 2025",
  algorithm: "RSA-4096",
  fingerprint: "SHA256:9f:86:d0:81:88:4c:7d:65:9a:2f:ea:a0:c5:5a:d0:15...",
  status: "valid" as const,
};

export default function Certificate() {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${label} has been copied.`,
    });
  };

  const validityPercent = 82;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">My Certificate</h1>
        <p className="text-muted-foreground">
          View and manage your cryptographic identity certificate.
        </p>
      </div>

      {/* Certificate Card */}
      <div className="security-card max-w-4xl">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
              <Award className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{certificateData.commonName}</h2>
              <p className="text-muted-foreground">{certificateData.email}</p>
            </div>
          </div>
          <StatusBadge status={certificateData.status} label="Valid" />
        </div>

        {/* Validity */}
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Validity Period</p>
            <p className="text-sm text-muted-foreground">{certificateData.validFrom} → {certificateData.validTo}</p>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-success" style={{ width: `${validityPercent}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{validityPercent}% of validity remaining</p>
        </div>

        <Separator className="my-6" />

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Preview */}
          <div>
            <p className="text-sm font-medium mb-2">Certificate Preview</p>
            <pre className="rounded-lg border border-border bg-muted/20 p-4 text-xs leading-5 overflow-auto max-h-64">
{`-----BEGIN CERTIFICATE-----
MIIF... (preview)
-----END CERTIFICATE-----`}
            </pre>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Serial Number</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                  {certificateData.serialNumber}
                </code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyToClipboard(certificateData.serialNumber, "Serial number")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Issuer</label>
              <p className="mt-1 text-sm">{certificateData.issuer}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Valid From</label>
              <p className="mt-1 text-sm">{certificateData.validFrom}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Valid To</label>
              <p className="mt-1 text-sm">{certificateData.validTo}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Algorithm</label>
              <p className="mt-1 text-sm">{certificateData.algorithm}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Fingerprint</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                  {certificateData.fingerprint}
                </code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyToClipboard(certificateData.fingerprint, "Fingerprint")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Download Certificate
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Public Key
          </Button>
        </div>
      </div>

      {/* Security Warning */}
      <div className="mt-6 max-w-3xl p-4 rounded-lg bg-warning/5 border border-warning/20">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Private Key Security</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your private key is securely stored and never displayed or shared. It is used locally to sign content and is protected by your account credentials.
            </p>
          </div>
        </div>
      </div>

      {/* Trust Chain */}
      <div className="mt-8 max-w-3xl">
        <h2 className="text-lg font-semibold mb-4">Certificate Trust Chain</h2>
        <div className="space-y-3">
          <div className="security-card flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Sealionyx Root CA</p>
              <p className="text-sm text-muted-foreground">Root Certificate Authority</p>
            </div>
            <StatusBadge status="valid" label="Trusted" />
          </div>

          <div className="ml-5 border-l-2 border-border h-4" />

          <div className="security-card flex items-center gap-4 ml-4">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Sealionyx Intermediate CA</p>
              <p className="text-sm text-muted-foreground">Intermediate Certificate Authority</p>
            </div>
            <StatusBadge status="valid" label="Valid" />
          </div>

          <div className="ml-9 border-l-2 border-border h-4" />

          <div className="security-card flex items-center gap-4 ml-8">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{certificateData.commonName}</p>
              <p className="text-sm text-muted-foreground">End Entity Certificate</p>
            </div>
            <StatusBadge status="valid" label="Your Certificate" />
          </div>
        </div>
      </div>
    </div>
  );
}
