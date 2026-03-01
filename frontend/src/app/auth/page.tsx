'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Mail, Lock, ArrowLeft, KeyRound, Fingerprint, ShieldCheck, Key, FileSignature } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Logo } from '@/components/Logo'
import { createBrowserClient } from '@/lib/supabase'
import { adminSignup } from '@/lib/api'

// 3D Floating Icons Component
function FloatingIcons() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large floating shield */}
      <div className="absolute top-[15%] left-[10%] animate-float-slow">
        <div className="relative">
          <Shield className="w-16 h-16 text-white/10" />
          <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full" />
        </div>
      </div>
      
      {/* Key icon */}
      <div className="absolute top-[25%] right-[15%] animate-float-medium" style={{ animationDelay: '1s' }}>
        <div className="transform rotate-45">
          <Key className="w-12 h-12 text-white/8" />
        </div>
      </div>
      
      {/* Fingerprint */}
      <div className="absolute bottom-[30%] left-[20%] animate-float-fast" style={{ animationDelay: '0.5s' }}>
        <Fingerprint className="w-20 h-20 text-secondary/15" />
      </div>
      
      {/* File signature */}
      <div className="absolute bottom-[20%] right-[10%] animate-float-slow" style={{ animationDelay: '1.5s' }}>
        <FileSignature className="w-14 h-14 text-white/10" />
      </div>
      
      {/* Small shield */}
      <div className="absolute top-[60%] left-[5%] animate-float-medium" style={{ animationDelay: '2s' }}>
        <ShieldCheck className="w-10 h-10 text-primary/20" />
      </div>
      
      {/* Lock */}
      <div className="absolute top-[10%] right-[30%] animate-float-fast" style={{ animationDelay: '0.8s' }}>
        <Lock className="w-8 h-8 text-white/10" />
      </div>
    </div>
  )
}

// Animated Grid Background
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
    </div>
  )
}

// Glowing Orbs
function GlowingOrbs() {
  return (
    <>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[128px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] animate-breathe" />
    </>
  )
}

// 3D Card Component
function Card3D({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [transform, setTransform] = useState('')
  const [glare, setGlare] = useState({ x: 50, y: 50 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = (y - centerY) / 20
    const rotateY = (centerX - x) / 20
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`)
    setGlare({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 })
  }

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)')
    setGlare({ x: 50, y: 50 })
  }

  return (
    <div
      className={`relative transition-transform duration-300 ease-out ${className}`}
      style={{ transform, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glare effect */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.15) 0%, transparent 60%)`,
        }}
      />
      {children}
    </div>
  )
}

// Particle System
function ParticleField() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([])

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 5,
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-white/20 animate-float-particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

// Hexagon Pattern
function HexagonPattern() {
  return (
    <div className="absolute inset-0 opacity-[0.02]">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
            <polygon 
              points="24.8,22 37.3,29.2 37.3,43.7 24.8,50.9 12.3,43.7 12.3,29.2" 
              fill="none" 
              stroke="white" 
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexagons)" />
      </svg>
    </div>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const supabase = createBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        // Use admin signup (bypasses rate limits, auto-confirms email)
        const adminResult = await adminSignup(email, password)

        if (adminResult.error) {
          const errMsg = adminResult.error.toLowerCase()
          if (errMsg.includes('already') || errMsg.includes('exists') || errMsg.includes('duplicate')) {
            throw new Error('A user with this email already exists. Please sign in instead.')
          }
          throw new Error(adminResult.error)
        }

        setMessage('Account created! Signing you in...')
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError

        router.push('/dashboard')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      
      if (errorMessage.toLowerCase().includes('rate limit')) {
        setError('Email rate limit exceeded. Please try again in a few minutes.')
      } else if (errorMessage.toLowerCase().includes('invalid login')) {
        setError('Invalid email or password. Please check your credentials.')
      } else if (errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('already')) {
        setError('A user with this email already exists. Please sign in instead.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Global animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5">
        <GridBackground />
        <GlowingOrbs />
      </div>

      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 relative z-10">
        <div className="max-w-md w-full mx-auto">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-all hover:-translate-x-1 group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to home
          </Link>

          <Card3D className="mb-8">
            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl shadow-primary/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-br from-primary to-secondary rounded-xl blur opacity-30 animate-pulse-slow" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Sealionyx</h1>
                  <p className="text-xs text-muted-foreground">Cryptographic Authenticity</p>
                </div>
              </div>
              
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
                  {isSignUp ? "Create your account" : "Welcome back"}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {isSignUp 
                    ? "Start securing your AI-generated content" 
                    : "Sign in to access your dashboard"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="animate-shake border-destructive/50 bg-destructive/10">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {message && (
                  <Alert variant="default" className="bg-success/10 border-success/30 text-success animate-bounce-in">
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-muted/50 border-border/50 transition-all focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 bg-muted/50 border-border/50 transition-all focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </div>

                {isSignUp && (
                  <div className="space-y-2 animate-fade-in-up">
                    <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 bg-muted/50 border-border/50 transition-all focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/25 text-white font-medium h-11 relative overflow-hidden group" 
                  size="lg" 
                  disabled={loading}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  {loading ? (
                    <span className="flex items-center gap-2 relative z-10">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Please wait...
                    </span>
                  ) : (
                    <span className="relative z-10">{isSignUp ? "Create Account" : "Sign In"}</span>
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError(null)
                    setMessage(null)
                  }}
                  className="text-primary hover:text-primary/80 font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-primary hover:after:w-full after:transition-all"
                >
                  {isSignUp ? "Sign in" : "Sign up"}
                </button>
              </p>
            </div>
          </Card3D>

          {/* Cryptographic identity notice */}
          <Card3D>
            <div className="p-4 rounded-xl bg-gradient-to-br from-info/5 to-primary/5 border border-info/20 backdrop-blur-sm">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                  <KeyRound className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Cryptographic Identity</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your unique X.509 certificate is created after login to sign all sealed content.
                  </p>
                </div>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      {/* Right side - 3D Visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-secondary/80">
          <ParticleField />
          <FloatingIcons />
          <HexagonPattern />
        </div>
        
        {/* Animated rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] border border-white/5 rounded-full animate-spin-very-slow" />
          <div className="absolute w-[400px] h-[400px] border border-white/10 rounded-full animate-spin-slow-reverse" />
          <div className="absolute w-[300px] h-[300px] border border-white/5 rounded-full animate-spin-very-slow" style={{ animationDirection: 'reverse' }} />
        </div>
        
        <div className="max-w-lg text-primary-foreground relative z-10">
          {/* 3D Shield Hero */}
          <div className="relative mb-12 flex justify-center">
            <div className="relative">
              {/* Outer glow ring */}
              <div className="absolute -inset-8 bg-white/10 rounded-full blur-2xl animate-pulse-slow" />
              <div className="absolute -inset-4 bg-white/5 rounded-full animate-breathe" />
              
              {/* Main shield container */}
              <div className="relative h-32 w-32 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-500 animate-float">
                <Shield className="h-16 w-16 text-white drop-shadow-2xl" />
                
                {/* Orbiting elements */}
                <div className="absolute inset-0 animate-orbit">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-secondary shadow-lg shadow-secondary/50" />
                </div>
                <div className="absolute inset-0 animate-orbit-reverse">
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-white/80 shadow-lg" />
                </div>
              </div>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold mb-6 text-center leading-tight">
            <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
              Cryptographic Proof
            </span>
            <br />
            <span className="text-white/90">for AI Content</span>
          </h2>
          
          <p className="text-lg text-white/80 leading-relaxed text-center mb-12">
            Seal, verify, and share AI-generated content with enterprise-grade cryptographic guarantees.
          </p>
          
          {/* Feature cards */}
          <div className="space-y-4">
            {[
              { icon: ShieldCheck, title: 'PKI Certificates', desc: 'X.509 identity verification' },
              { icon: Fingerprint, title: 'Digital Signatures', desc: 'RSA-PSS with SHA-256' },
              { icon: Lock, title: 'Hybrid Encryption', desc: 'AES-256 + RSA-OAEP' },
            ].map((feature, i) => (
              <div 
                key={feature.title}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:translate-x-2 group"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">{feature.title}</p>
                  <p className="text-sm text-white/60">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
