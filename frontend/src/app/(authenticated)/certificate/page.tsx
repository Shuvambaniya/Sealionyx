'use client'

import { useEffect, useState } from 'react'
import { 
  Award, 
  AlertCircle, 
  CheckCircle,
  Copy,
  Download,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Key
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StatusBadge } from '@/components/ui/status-badge'
import { createBrowserClient } from '@/lib/supabase'
import { getMyCertificate, provisionUser, revokeUser, healthCheck } from '@/lib/api'
import { formatDate, copyToClipboard } from '@/lib/utils'
import type { CertificateInfo } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function isNetworkError(msg: string): boolean {
  const m = (msg || '').toLowerCase()
  return (
    m === 'load failed' ||
    m === 'failed to fetch' ||
    m.includes('network error') ||
    m.includes('network request failed') ||
    m.includes('connection refused') ||
    m.includes('err_connection_refused')
  )
}

function formatCertificateError(error: string): string {
  if (isNetworkError(error)) {
    return `Cannot reach the backend server. Make sure it is running at ${API_URL}. Start it with: cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000`
  }
  return error
}

export default function CertificatePage() {
  const [certificate, setCertificate] = useState<CertificateInfo | null>(null)
  const [certPem, setCertPem] = useState<string | null>(null)
  const [publicKeyPem, setPublicKeyPem] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [backendReachable, setBackendReachable] = useState<boolean | null>(null)

  const supabase = createBrowserClient()

  useEffect(() => {
    let cancelled = false
    healthCheck()
      .then((res) => { if (!cancelled) setBackendReachable(!res.error) })
      .catch(() => { if (!cancelled) setBackendReachable(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    loadCertificate()
  }, [])

  const loadCertificate = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      const result = await getMyCertificate(session.access_token)

      if (result.error) {
        if (result.error.includes('not been provisioned')) {
          setCertificate(null)
          setCertPem(null)
          setPublicKeyPem(null)
        } else {
          setError(formatCertificateError(result.error))
        }
      } else if (result.data) {
        const cert = result.data.certificate
        const certPemVal = result.data.certificate_pem
        const pubKeyVal = result.data.public_key_pem
        if (cert && certPemVal != null && pubKeyVal != null) {
          setCertificate(cert)
          setCertPem(certPemVal)
          setPublicKeyPem(pubKeyVal)
        } else {
          setError('Certificate data incomplete. Please try again.')
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load certificate'
      setError(formatCertificateError(msg))
    } finally {
      setLoading(false)
    }
  }

  const handleProvision = async () => {
    setProvisioning(true)
    setError(null)
    setSuccess(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const result = await provisionUser(session.access_token)

      if (result.error) {
        setError(formatCertificateError(result.error))
      } else if (result.data) {
        setSuccess('Certificate provisioned successfully!')
        const cert = result.data.certificate
        const certPemVal = result.data.certificate_pem
        const pubKeyVal = result.data.public_key_pem
        if (cert && certPemVal != null && pubKeyVal != null) {
          setCertificate(cert)
          setCertPem(certPemVal)
          setPublicKeyPem(pubKeyVal)
        } else {
          setError(null)
          await loadCertificate()
        }
      }
    } catch (err) {
      setError(formatCertificateError(err instanceof Error ? err.message : 'Provisioning failed'))
    } finally {
      setProvisioning(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke your certificate? This action cannot be undone.')) {
      return
    }

    setRevoking(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const result = await revokeUser(session.access_token, { reason: 'user_requested' })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess('Certificate revoked successfully')
        await loadCertificate()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revocation failed')
    } finally {
      setRevoking(false)
    }
  }

  const handleCopySerial = async () => {
    if (certificate?.serial_number) {
      await copyToClipboard(certificate.serial_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadCert = () => {
    if (certPem) {
      const blob = new Blob([certPem], { type: 'application/x-pem-file' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'certificate.pem'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleDownloadPublicKey = () => {
    if (publicKeyPem) {
      const blob = new Blob([publicKeyPem], { type: 'application/x-pem-file' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'public_key.pem'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    )
  }

  // No certificate state
  if (!certificate) {
    return (
      <div>
        <div className="mb-8 max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-2">My Certificate</h1>
          <p className="text-muted-foreground">
            View and manage your cryptographic identity certificate.
          </p>
        </div>

        {backendReachable === false && (
          <Alert className="mb-6 max-w-4xl mx-auto border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              Backend is not reachable at {API_URL}. Start it with:{' '}
              <code className="text-xs mt-1 block bg-background/50 p-2 rounded">
                cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000
              </code>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6 max-w-4xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => loadCertificate()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="security-card max-w-2xl mx-auto text-center py-12">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-6">
            <Key className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Certificate Found</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            You haven't been provisioned with a digital certificate yet.
            Get one to start sealing and encrypting content.
          </p>
          <Button onClick={handleProvision} disabled={provisioning} size="lg">
            {provisioning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Provisioning...
              </>
            ) : (
              <>
                <Key className="h-4 w-4 mr-2" />
                Get Certificate
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Has certificate state
  return (
    <div>
      <div className="mb-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">My Certificate</h1>
        <p className="text-muted-foreground">
          View and manage your cryptographic identity certificate.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6 max-w-4xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-success/10 border-success/25 max-w-4xl mx-auto">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">{success}</AlertDescription>
        </Alert>
      )}

      {/* Certificate Card */}
      <div className="security-card max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Award className="h-7 w-7 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold truncate">{certificate.subject || 'User Certificate'}</h2>
              <p className="text-muted-foreground truncate">{certificate.issuer}</p>
            </div>
          </div>
          <StatusBadge 
            status={certificate.status === 'active' ? 'valid' : 'error'} 
            label={certificate.status === 'active' ? 'Valid' : certificate.status} 
          />
        </div>

        {/* Validity */}
        <div className="rounded-lg border border-border bg-muted/20 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Validity Period</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(certificate.not_valid_before)} → {formatDate(certificate.not_valid_after)}
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-success" style={{ width: '82%' }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Certificate validity remaining</p>
        </div>

        <div className="border-t border-border my-6" />

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Preview */}
          <div>
            <p className="text-sm font-medium mb-2">Certificate Preview</p>
            <pre className="rounded-lg border border-border bg-muted/20 p-4 text-xs leading-5 overflow-auto max-h-64">
              {certPem || '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----'}
            </pre>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Serial Number</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                  {certificate.serial_number}
                </code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 shrink-0"
                  onClick={handleCopySerial}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Issuer</label>
              <p className="mt-1 text-sm">{certificate.issuer}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Valid From</label>
              <p className="mt-1 text-sm">{formatDate(certificate.not_valid_before)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Valid To</label>
              <p className="mt-1 text-sm">{formatDate(certificate.not_valid_after)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Algorithm</label>
              <p className="mt-1 text-sm">RSA-2048</p>
            </div>

            {certificate.fingerprint_sha256 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Fingerprint (SHA-256)</label>
                <code className="block text-xs font-mono bg-muted px-2 py-1 rounded mt-1 break-all">
                  {certificate.fingerprint_sha256}
                </code>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border my-6" />

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleDownloadCert} disabled={!certPem}>
            <Download className="h-4 w-4 mr-2" />
            Download Certificate
          </Button>
          <Button variant="outline" onClick={handleDownloadPublicKey} disabled={!publicKeyPem}>
            <Download className="h-4 w-4 mr-2" />
            Download Public Key
          </Button>
        </div>
      </div>

      {/* Security Warning */}
      <div className="mt-6 max-w-4xl mx-auto p-4 rounded-lg bg-warning/5 border border-warning/20">
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
      <div className="mt-8 max-w-4xl mx-auto">
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

          <div className="security-card flex items-center gap-4 ml-8">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Your Certificate</p>
              <p className="text-sm text-muted-foreground">End Entity Certificate</p>
            </div>
            <StatusBadge status={certificate.status === 'active' ? 'valid' : 'error'} label="Your Certificate" />
          </div>
        </div>
      </div>

      {/* Revoked: Get new certificate */}
      {certificate.status === 'revoked' && (
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="security-card border-amber-500/30 bg-amber-500/5">
            <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-500 mb-2">Certificate Revoked</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This certificate is no longer valid. Get a new certificate to seal and encrypt content again.
            </p>
            <Button
              onClick={handleProvision}
              disabled={provisioning}
              size="lg"
            >
              {provisioning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Provisioning...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Get New Certificate
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      {certificate.status === 'active' && (
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="security-card border-destructive/25">
            <h3 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Revoking your certificate will prevent you from signing or encrypting content.
              This action cannot be undone.
            </p>
            <Button 
              variant="destructive" 
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Revoke Certificate
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
