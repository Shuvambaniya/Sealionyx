'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Shield, 
  ShieldCheck, 
  FileCheck, 
  Lock, 
  CheckCircle2,
  ArrowRight,
  LogOut,
  Fingerprint,
  Key,
  FileSignature,
  Zap,
  Globe,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { createBrowserClient } from '@/lib/supabase'

// Subtle animated gradient mesh
function GradientMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-breathe" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] animate-breathe" style={{ animationDelay: '2s' }} />
    </div>
  )
}

// Minimal floating elements
function FloatingElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      <div className="absolute top-[20%] left-[10%] animate-float-slow">
        <div className="h-1 w-1 rounded-full bg-primary" />
      </div>
      <div className="absolute top-[30%] right-[15%] animate-float-medium" style={{ animationDelay: '1s' }}>
        <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
      </div>
      <div className="absolute bottom-[40%] left-[20%] animate-float-fast" style={{ animationDelay: '0.5s' }}>
        <div className="h-1 w-1 rounded-full bg-primary" />
      </div>
      <div className="absolute top-[60%] right-[25%] animate-float-slow" style={{ animationDelay: '1.5s' }}>
        <div className="h-2 w-2 rounded-full bg-primary/50" />
      </div>
    </div>
  )
}

// Grid pattern background
function GridPattern() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black,transparent)]" />
  )
}

const features = [
  {
    icon: ShieldCheck,
    title: "Authenticity",
    subtitle: "PKI + Certificates",
    description: "Every user receives a cryptographic certificate tied to their identity. Content is signed with your private key, proving you are the creator.",
    gradient: "from-primary/10 to-primary/5",
  },
  {
    icon: FileCheck,
    title: "Integrity",
    subtitle: "Hashes + Digital Signatures",
    description: "Cryptographic hashes ensure content hasn't been modified. Any tampering is immediately detectable through signature verification.",
    gradient: "from-secondary/10 to-secondary/5",
  },
  {
    icon: Lock,
    title: "Confidentiality",
    subtitle: "Hybrid Encryption",
    description: "Share sensitive AI content securely. Only the intended recipient can decrypt using their private key.",
    gradient: "from-info/10 to-info/5",
  },
]

const howItWorks = [
  { 
    step: "01", 
    title: "Create Identity", 
    description: "Sign up and receive your unique X.509 cryptographic certificate",
    icon: Fingerprint,
  },
  { 
    step: "02", 
    title: "Seal Content", 
    description: "Hash and digitally sign your AI-generated content with RSA-PSS",
    icon: FileSignature,
  },
  { 
    step: "03", 
    title: "Share & Verify", 
    description: "Recipients can verify authenticity and integrity instantly",
    icon: CheckCircle2,
  },
]

const stats = [
  { value: "RSA-2048", label: "Key Size" },
  { value: "SHA-256", label: "Hash Algorithm" },
  { value: "AES-256", label: "Encryption" },
  { value: "X.509", label: "Certificates" },
]

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsLoggedIn(true)
        setUserEmail(session.user.email || null)
      }
    }
    checkAuth()

    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setUserEmail(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm' 
          : 'bg-transparent'
      }`}>
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="transition-transform hover:scale-105">
            <Logo />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group">
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all group-hover:w-full" />
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group">
              How It Works
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all group-hover:w-full" />
            </a>
            <Link href="/verify" className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group">
              Verify
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all group-hover:w-full" />
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" className="transition-all hover:bg-primary/10">Dashboard</Button>
                </Link>
                <Button variant="outline" onClick={handleSignOut} className="transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth">
                  <Button variant="ghost" className="transition-all hover:bg-primary/10">Sign In</Button>
                </Link>
                <Link href="/verify">
                  <Button className="bg-primary hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20">
                    Verify a Bundle
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <GradientMesh />
        <GridPattern />
        <FloatingElements />
        
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-card/50 backdrop-blur-sm border border-border/50 animate-fade-in-down">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-muted-foreground">Cryptographic Authenticity Platform</span>
            </div>
            
            {/* Main heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight mb-8 animate-fade-in-up stagger-1">
              <span className="text-foreground">Make AI content</span>
              <br />
              <span className="relative">
                <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
                  verifiable.
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 10C50 4 150 2 298 8" stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round" className="animate-draw-line" />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--secondary))" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up stagger-2">
              Cryptographic proof of origin, integrity, and authenticity for AI-generated content. 
              Know who created it, whether it was modified, and if it can be trusted.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up stagger-3">
              {isLoggedIn ? (
                <Link href="/seal">
                  <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/25 group">
                    Seal Content
                    <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              ) : (
                <Link href="/auth">
                  <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/25 group">
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              )}
              <Link href="/verify">
                <Button size="lg" variant="outline" className="h-12 px-8 border-border/50 hover:bg-card/50 hover:border-primary/30 transition-all hover:scale-105">
                  Verify a Bundle
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm animate-fade-in-up stagger-4">
              {[
                { icon: ShieldCheck, text: "PKI-based certificates" },
                { icon: FileSignature, text: "Digital signatures" },
                { icon: Lock, text: "Hybrid encryption" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground group">
                  <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                    <item.icon className="h-4 w-4 text-success" />
                  </div>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 border-y border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center group">
                <p className="text-2xl md:text-3xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent" />
        
        <div className="container relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-primary/5 border border-primary/10">
              <Zap className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Core Features</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Enterprise-Grade Security</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built on proven cryptographic standards to ensure your AI-generated content is trustworthy and verifiable.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                
                <div className="relative">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-primary font-medium mb-4">{feature.subtitle}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 relative">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-secondary/5 border border-secondary/10">
              <Globe className="h-3 w-3 text-secondary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Simple Process</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to cryptographically secure your AI-generated content.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            
            {howItWorks.map((item, i) => (
              <div key={item.step} className="relative text-center group">
                {/* Step number */}
                <div className="relative inline-flex mb-6">
                  <div className="h-20 w-20 rounded-2xl bg-card border border-border/50 flex items-center justify-center group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all group-hover:-translate-y-1">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                    {item.step}
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_70%)]" />
        
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_25%,rgba(255,255,255,0.05)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.05)_75%)] bg-[size:60px_60px]" />
        </div>
        
        <div className="container relative text-center">
          <div className="max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-white/10 border border-white/20">
              <Users className="h-3 w-3 text-white" />
              <span className="text-xs text-white/80 uppercase tracking-wider">Join Today</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
              Ready to secure your AI content?
            </h2>
            <p className="text-white/80 mb-10 text-lg">
              Start creating verifiable, tamper-proof AI-generated content with enterprise-grade cryptography.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth">
                <Button size="lg" variant="secondary" className="h-12 px-8 bg-white text-primary hover:bg-white/90 transition-all hover:scale-105 hover:shadow-xl group">
                  Get Started Free
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/verify">
                <Button size="lg" variant="outline" className="h-12 px-8 border-white/30 text-white hover:bg-white/10 transition-all hover:scale-105">
                  Try Verification
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-border/50 bg-card/30">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center md:items-start gap-4">
              <Logo size="sm" />
              <p className="text-sm text-muted-foreground max-w-xs text-center md:text-left">
                Cryptographic authenticity platform for AI-generated content.
              </p>
            </div>
            
            <div className="flex items-center gap-8">
              <Link href="/verify" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Verify
              </Link>
              <Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2026 Sealionyx
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
