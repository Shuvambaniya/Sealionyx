import { ShieldCheck, FileCheck, Lock } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Authenticity",
    subtitle: "PKI + Certificates",
    description: "Every user receives a cryptographic certificate tied to their identity. Content is signed with your private key, proving you are the creator.",
  },
  {
    icon: FileCheck,
    title: "Integrity",
    subtitle: "Hashes + Digital Signatures",
    description: "Cryptographic hashes ensure content hasn't been modified. Any tampering is immediately detectable through signature verification.",
  },
  {
    icon: Lock,
    title: "Confidentiality",
    subtitle: "Hybrid Encryption",
    description: "Share sensitive AI content securely. Only the intended recipient can decrypt using their private key.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold mb-4">Enterprise-Grade Security</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built on proven cryptographic standards to ensure your AI-generated content is trustworthy and verifiable.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="security-card group"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              
              <h3 className="text-xl font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-primary/70 font-medium mb-3">{feature.subtitle}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
