import { LogIn, Award, FileSignature, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: LogIn,
    number: "01",
    title: "User Logs In",
    description: "Authenticate securely with your credentials to access the platform.",
  },
  {
    icon: Award,
    number: "02",
    title: "Certificate Issued",
    description: "A unique cryptographic certificate is generated and bound to your identity.",
  },
  {
    icon: FileSignature,
    number: "03",
    title: "AI Content is Sealed",
    description: "Your AI-generated content is hashed and digitally signed with your certificate.",
  },
  {
    icon: CheckCircle,
    number: "04",
    title: "Anyone Can Verify",
    description: "Third parties can verify authenticity, integrity, and trust chain without your involvement.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A simple four-step process to ensure your AI content is cryptographically verifiable.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-4 gap-6 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-0.5 bg-border" />
            
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="relative z-10 h-24 w-24 rounded-full bg-background border-2 border-border flex items-center justify-center mb-4 shadow-security">
                    <step.icon className="h-10 w-10 text-primary" />
                  </div>
                  
                  <span className="text-xs font-semibold text-primary/60 mb-2">
                    STEP {step.number}
                  </span>
                  
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
