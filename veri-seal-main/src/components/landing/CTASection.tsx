import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center">
          <Shield className="h-12 w-12 mx-auto mb-6 opacity-80" />
          
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Start Securing Your AI Content Today
          </h2>
          
          <p className="text-lg opacity-80 mb-8 max-w-xl mx-auto">
            Create your cryptographic identity and begin sealing AI-generated content with verifiable proof of authenticity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="xl" 
              className="bg-background text-foreground hover:bg-background/90"
              asChild
            >
              <Link to="/auth">
                Create Account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="xl"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              asChild
            >
              <Link to="/verify">
                Verify Content
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
