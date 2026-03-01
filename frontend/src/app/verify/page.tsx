'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Shield, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  Upload,
  RefreshCw,
  FileJson,
  ArrowLeft,
  LogOut,
  User,
  Link2,
  AlertTriangle,
  Clock,
  Calendar,
  Hash,
  ShieldAlert,
  FileWarning
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Logo } from '@/components/Logo'
import { quickVerify, verifyEmbeddedSeal } from '@/lib/api'
import { createBrowserClient } from '@/lib/supabase'
import type { VerificationResult } from '@/types'

export default function PublicVerifyPage() {
  const [bundleJson, setBundleJson] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [verifyMode, setVerifyMode] = useState<'bundle' | 'image'>('bundle')
  const [imageData, setImageData] = useState<string | null>(null)
  const [imageFilename, setImageFilename] = useState<string | null>(null)
  
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
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setUserEmail(null)
  }

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (!bundleJson.trim()) {
      setError('Please enter or upload a bundle')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const bundle = JSON.parse(bundleJson)
      
      const response = await quickVerify({
        bundle,
        content: originalContent || undefined,
      })

      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setResult({
          valid: response.data.valid,
          message: response.data.valid ? 'Verification successful' : 'Verification failed',
          details: response.data.details,
        })
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format. Please check your bundle.')
      } else {
        setError(err instanceof Error ? err.message : 'Verification failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (file: File) => {
    // Check if it's an image file
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        setImageData(content)
        setImageFilename(file.name)
        setVerifyMode('image')
        setBundleJson('')
      }
      reader.readAsDataURL(file)
    } else {
      // It's a JSON bundle
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        setBundleJson(content)
        setImageData(null)
        setImageFilename(null)
        setVerifyMode('bundle')
      }
      reader.readAsText(file)
    }
  }

  const handleVerifyImage = async () => {
    if (!imageData) {
      setError('Please upload an image')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await verifyEmbeddedSeal({ image_data: imageData })

      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setResult({
          valid: response.data.valid,
          message: response.data.message,
          details: response.data.details,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.json') || file.type.startsWith('image/'))) {
      handleFileUpload(file)
    }
  }

  const handleReset = () => {
    setBundleJson('')
    setOriginalContent('')
    setImageData(null)
    setImageFilename(null)
    setVerifyMode('bundle')
    setResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>
                <Button variant="ghost" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/auth">
                  <Button variant="hero">Get Started</Button>
                </Link>
              </>
            )}
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

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!result ? (
            // Upload State
            <div
              className={`security-card border-2 border-dashed transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="py-8 text-center">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                  {loading ? (
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileJson className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                
                <h3 className="text-xl font-medium mb-2">
                  {loading ? "Verifying..." : "Upload File to Verify"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {loading
                    ? "Checking digital signature, content hash, and certificate trust chain"
                    : "Drag and drop a bundle.json file or a sealed image"}
                </p>

                {!loading && !bundleJson && !imageData && (
                  <div className="space-y-4">
                    <div className="flex gap-3 justify-center flex-wrap">
                      <input
                        type="file"
                        id="bundle-file-input"
                        accept=".json,application/json,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleFileUpload(file)
                            e.target.value = '' // Reset input
                          }
                        }}
                        className="hidden"
                      />
                      <Button 
                        size="lg" 
                        onClick={() => document.getElementById('bundle-file-input')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Select File
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supports: bundle.json files or images with embedded seals (JPEG, PNG, WEBP)
                    </p>
                  </div>
                )}

                {/* Bundle JSON mode */}
                {!loading && bundleJson && verifyMode === 'bundle' && (
                  <div className="mt-6 text-left">
                    <label className="text-sm font-medium mb-2 block">Bundle JSON</label>
                    <Textarea
                      value={bundleJson}
                      onChange={(e) => setBundleJson(e.target.value)}
                      className="font-mono text-sm bg-muted/50 min-h-[200px]"
                    />
                    
                    <label className="text-sm font-medium mt-4 mb-2 block">
                      Original Content (optional)
                    </label>
                    <Textarea
                      value={originalContent}
                      onChange={(e) => setOriginalContent(e.target.value)}
                      placeholder="Paste original content to verify hash..."
                      className="bg-muted/50"
                      rows={4}
                    />

                    <div className="flex gap-3 mt-4">
                      <Button onClick={() => handleVerify()} className="flex-1">
                        <Shield className="h-4 w-4 mr-2" />
                        Verify Bundle
                      </Button>
                      <Button variant="outline" onClick={handleReset}>
                        Reset
                      </Button>
                    </div>
                  </div>
                )}

                {/* Image mode */}
                {!loading && imageData && verifyMode === 'image' && (
                  <div className="mt-6 text-left">
                    <label className="text-sm font-medium mb-2 block">Sealed Image</label>
                    <div className="border border-border rounded-lg p-4 bg-muted/30 mb-4">
                      <img 
                        src={imageData} 
                        alt="Uploaded" 
                        className="max-h-64 mx-auto rounded"
                      />
                      <p className="text-center text-sm text-muted-foreground mt-2">
                        {imageFilename}
                      </p>
                    </div>

                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                      <p className="text-sm text-muted-foreground">
                        This image will be checked for an embedded cryptographic seal in its metadata (EXIF/XMP).
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button onClick={handleVerifyImage} className="flex-1">
                        <Shield className="h-4 w-4 mr-2" />
                        Verify Image Seal
                      </Button>
                      <Button variant="outline" onClick={handleReset}>
                        Reset
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Result State
            <div className="space-y-6">
              {/* Overall Result */}
              <div
                className={`security-card ${
                  result.valid
                    ? "verification-pass"
                    : "verification-fail"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Public verification</p>
                    <h2 className="text-3xl font-semibold tracking-tight">
                      {result.valid ? (
                        <span className="text-success">PASS</span>
                      ) : (
                        <span className="text-destructive">FAIL</span>
                      )}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.valid
                        ? "Signature and hash verification succeeded."
                        : "One or more checks failed. Review details below."}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center">
                    {result.valid ? (
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
                  <VerificationRow
                    icon={<Shield className="h-5 w-5" />}
                    title="Authenticity"
                    subtitle="Digital signature verification"
                    passed={result.details.signature_valid}
                  />
                  
                  <VerificationRow
                    icon={<CheckCircle className="h-5 w-5" />}
                    title="Integrity"
                    subtitle="Content hash verification"
                    passed={result.details.hash_valid}
                  />
                  
                  <VerificationRow
                    icon={<Link2 className="h-5 w-5" />}
                    title="Trust Chain"
                    subtitle="Certificate authority validation"
                    passed={result.details.certificate_chain_valid}
                  />
                  
                  <VerificationRow
                    icon={<AlertTriangle className="h-5 w-5" />}
                    title="Revocation Status"
                    subtitle="Certificate validity check"
                    passed={result.details.certificate_not_revoked}
                    isLast
                  />
                </div>
              </div>

              {/* Signer Info & Timestamp */}
              {(result.details.signer_info || result.details.metadata) && (
                <div className="security-card">
                  <h3 className="font-semibold mb-4">Signer Information</h3>
                  
                  {result.details.signer_info && (
                    <div className="flex items-start gap-4 mb-6">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {result.details.signer_info.common_name || result.details.signer_info.email || 'Unknown'}
                        </p>
                        {result.details.signer_info.email && (
                          <p className="text-sm text-muted-foreground">{result.details.signer_info.email}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          Certificate: {result.details.signer_info.serial_number}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Sealing Timestamp */}
                  {result.details.metadata?.timestamp && (
                    <div className="border-t border-border pt-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Sealed At</p>
                          <p className="text-sm font-mono">
                            {new Date(result.details.metadata.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {result.details.metadata.model_name && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">AI Model</p>
                            <p className="text-sm">{result.details.metadata.model_name}</p>
                          </div>
                        )}
                        {result.details.metadata.title && (
                          <div className="sm:col-span-2">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Title</p>
                            <p className="text-sm">{result.details.metadata.title}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Certificate Validity */}
                  {result.details.signer_info && (
                    <div className="border-t border-border pt-4 mt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Certificate Validity</p>
                      <div className="grid sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Valid From: </span>
                          <span className="font-mono">{new Date(result.details.signer_info.not_valid_before).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Valid Until: </span>
                          <span className="font-mono">{new Date(result.details.signer_info.not_valid_after).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Hash Comparison - Tampering Evidence */}
              {result.details.hash_comparison && !result.details.hash_comparison.match && (
                <div className="security-card border-destructive/50 bg-destructive/5">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <FileWarning className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-destructive text-lg">Content Modified After Sealing</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        The content you provided does not match what was originally sealed. 
                        This indicates the content has been tampered with or altered.
                      </p>
                    </div>
                  </div>

                  <div className="bg-background/50 rounded-lg border border-border p-4 space-y-4">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Hash Comparison (SHA-256)
                    </p>
                    
                    {/* Original Hash */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium">Original Hash (from sealed bundle)</span>
                      </div>
                      <code className="block text-xs font-mono bg-success/5 text-success border border-success/20 rounded px-3 py-2 break-all">
                        {result.details.hash_comparison.original_hash}
                      </code>
                    </div>

                    {/* Computed Hash */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-medium">Computed Hash (from provided content)</span>
                      </div>
                      <code className="block text-xs font-mono bg-destructive/5 text-destructive border border-destructive/20 rounded px-3 py-2 break-all">
                        {result.details.hash_comparison.computed_hash}
                      </code>
                    </div>

                    {/* Visual difference indicator */}
                    <div className="flex items-center justify-center py-2">
                      <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-2 rounded-full">
                        <ShieldAlert className="h-4 w-4" />
                        <span className="text-sm font-medium">Hashes Do Not Match</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    <strong>What this means:</strong> The cryptographic fingerprint of the content you provided 
                    is different from the fingerprint that was recorded when the content was originally sealed. 
                    Even a single character change will produce a completely different hash.
                  </p>
                </div>
              )}

              {/* Hash Match Success - Show when content provided and matches */}
              {result.details.hash_comparison?.match && (
                <div className="security-card border-success/50 bg-success/5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-6 w-6 text-success" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-success">Content Integrity Verified</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        The content matches the original sealed content exactly. No tampering detected.
                      </p>
                      <div className="mt-3 bg-background/50 rounded-lg border border-border p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Verified Hash (SHA-256)</p>
                        <code className="text-xs font-mono text-success break-all">
                          {result.details.hash_comparison.original_hash}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.details.errors && result.details.errors.length > 0 && (
                <div className="security-card border-destructive/25 bg-destructive/5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-destructive">Verification Failed</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        The bundle could not be verified. See details below.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {result.details.errors.map((err, i) => {
                      // Provide user-friendly explanations for common errors
                      let explanation = ''
                      if (err.includes('parse certificate') || err.includes('PEM')) {
                        explanation = 'The certificate in this bundle is invalid or corrupted. This bundle may not have been created by Sealionyx.'
                      } else if (err.includes('signature is invalid') || err.includes('Signature verification failed')) {
                        explanation = 'The digital signature does not match. The bundle may have been tampered with.'
                      } else if (err.includes('revoked')) {
                        explanation = 'The signer\'s certificate has been revoked and can no longer be trusted.'
                      } else if (err.includes('expired')) {
                        explanation = 'The signer\'s certificate has expired.'
                      } else if (err.includes('different CA') || err.includes('CA rotation')) {
                        explanation = 'This certificate was issued by a previous Certificate Authority. The user needs to get a new certificate and re-seal the content.'
                      } else if (err.includes('not signed by trusted CA')) {
                        explanation = 'This certificate was not issued by the Sealionyx Certificate Authority.'
                      } else if (err.includes('hash mismatch') || err.includes('modified after sealing')) {
                        explanation = 'The content has been changed since it was originally sealed.'
                      }
                      
                      return (
                        <div key={i} className="bg-background/50 rounded-lg border border-destructive/20 p-3">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-destructive font-medium break-words">{err}</p>
                              {explanation && (
                                <p className="text-xs text-muted-foreground mt-1">{explanation}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      <strong>What to do:</strong> Ensure you're using a valid bundle.json file that was created 
                      by sealing content in Sealionyx. If you believe this is an error, contact the content creator.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleReset}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Verify Another
                </Button>
                {!isLoggedIn && (
                  <Link href="/auth">
                    <Button variant="hero">Create Your Account</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="container py-8 mt-8 border-t border-border">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Sealionyx - Cryptographic Authenticity Platform</span>
          {isLoggedIn ? (
            <Link href="/seal" className="text-primary hover:underline">
              Seal your own content
            </Link>
          ) : (
            <Link href="/auth" className="text-primary hover:underline">
              Sign in to seal your own content
            </Link>
          )}
        </div>
      </footer>
    </div>
  )
}

function VerificationRow({ 
  icon, 
  title, 
  subtitle, 
  passed,
  isLast = false
}: { 
  icon: React.ReactNode
  title: string
  subtitle: string
  passed?: boolean
  isLast?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-3 ${!isLast ? 'border-b border-border' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {passed === undefined ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          N/A
        </span>
      ) : passed ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
          <CheckCircle className="h-3.5 w-3.5" /> Pass
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
          <XCircle className="h-3.5 w-3.5" /> Fail
        </span>
      )}
    </div>
  )
}
