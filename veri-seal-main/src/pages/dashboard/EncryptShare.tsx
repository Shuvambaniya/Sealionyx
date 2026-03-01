import { useState } from "react";
import { Lock, Upload, Download, CheckCircle, AlertCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

const recipients = [
  { id: "1", name: "Alice Johnson", email: "alice@example.com" },
  { id: "2", name: "Bob Smith", email: "bob@example.com" },
  { id: "3", name: "Carol Williams", email: "carol@example.com" },
  { id: "4", name: "David Brown", email: "david@example.com" },
];

export default function EncryptShare() {
  const [content, setContent] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(false);

  const selectedRecipient = recipients.find((r) => r.id === recipientId);

  const handleEncrypt = () => {
    if (!content || !recipientId) {
      toast({
        title: "Missing Information",
        description: "Please provide content and select a recipient.",
        variant: "destructive",
      });
      return;
    }

    setIsEncrypted(true);
    toast({
      title: "Content Encrypted",
      description: `Encrypted for ${selectedRecipient?.name}`,
    });
  };

  const handleReset = () => {
    setContent("");
    setRecipientId("");
    setIsEncrypted(false);
  };

  if (isEncrypted) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">Encryption Complete</h1>
          <p className="text-muted-foreground">
            Your content has been encrypted and is ready to share.
          </p>
        </div>

        <div className="max-w-2xl">
          <div className="security-card">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Content Encrypted</h2>
                <p className="text-sm text-muted-foreground">
                  Only {selectedRecipient?.name} can decrypt this content
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedRecipient?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRecipient?.email}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                The recipient's public key was used for encryption. They can decrypt using their private key.
              </p>
            </div>

            <Separator className="my-6" />

            <div className="flex flex-wrap gap-3">
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Download Encrypted Bundle
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Encrypt Another
              </Button>
            </div>
          </div>

          {/* Security Info */}
          <div className="mt-6 p-4 rounded-lg bg-info/5 border border-info/20">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-info shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Hybrid Encryption</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Content is encrypted using AES-256, and the symmetric key is encrypted with the recipient's RSA public key. Only the intended recipient can decrypt this content.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Encrypt & Share</h1>
        <p className="text-muted-foreground">
          Encrypt content for a specific recipient using their public key.
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="security-card">
          <div className="space-y-6">
            {/* Recipient Selection */}
            <div>
              <Label htmlFor="recipient" className="text-sm font-medium">
                Select Recipient <span className="text-destructive">*</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Choose who will be able to decrypt this content
              </p>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a recipient" />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map((recipient) => (
                    <SelectItem key={recipient.id} value={recipient.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {recipient.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">{recipient.name}</span>
                          <span className="text-muted-foreground ml-2">{recipient.email}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Content Input */}
            <div>
              <Label htmlFor="content" className="text-sm font-medium">
                Content to Encrypt <span className="text-destructive">*</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Paste the content you want to encrypt or upload a file
              </p>
              <Textarea
                id="content"
                placeholder="Paste content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <div className="mt-3">
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </div>

            <Separator />

            {/* Encrypt Button */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Uses hybrid encryption (AES-256 + RSA)
              </p>
              <Button onClick={handleEncrypt} size="lg">
                <Lock className="h-4 w-4 mr-2" />
                Encrypt for Recipient
              </Button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex gap-3">
            <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">End-to-End Encryption</p>
              <p className="text-sm text-muted-foreground mt-1">
                Only the intended recipient can decrypt this content using their private key. Even Sealionyx cannot access the encrypted content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
