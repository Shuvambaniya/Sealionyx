'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Award, 
  FileSignature, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  Link2, 
  Lock,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { createBrowserClient } from '@/lib/supabase'
import { getMyStatus, provisionUser, getAuditStats, getPKIInfo, initPKI } from '@/lib/api'
import type { UserCryptoStatus, PKIInfo } from '@/types'

function ProgressBar({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, value))
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className="h-full bg-primary transition-all" style={{ width: `${safe}%` }} />
    </div>
  )
}

export default function DashboardPage() {
  const [status, setStatus] = useState<UserCryptoStatus | null>(null)
  const [pkiInfo, setPkiInfo] = useState<PKIInfo | null>(null)
  const [auditStats, setAuditStats] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [initializingPKI, setInitializingPKI] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createBrowserClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const token = session.access_token

      // Load user status
      const statusRes = await getMyStatus(token)
      if (statusRes.data) {
        setStatus(statusRes.data)
      }

      // Load PKI info
      const pkiRes = await getPKIInfo()
      if (pkiRes.data) {
        setPkiInfo(pkiRes.data)
      }

      // Load audit stats
      const statsRes = await getAuditStats(token)
      if (statsRes.data?.by_action) {
        setAuditStats(statsRes.data.by_action)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInitPKI = async () => {
    setInitializingPKI(true)
    setError(null)

    try {
      const result = await initPKI()
      
      if (result.error) {
        setError(result.error)
      } else {
        await loadData()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PKI initialization failed')
    } finally {
      setInitializingPKI(false)
    }
  }

  const handleProvision = async () => {
    setProvisioning(true)
    setError(null)

    try {
      if (!pkiInfo?.initialized) {
        await initPKI()
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const result = await provisionUser(session.access_token)
      
      if (result.error) {
        setError(result.error)
      } else {
        await loadData()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Provisioning failed')
    } finally {
      setProvisioning(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="h-40 bg-muted rounded-lg animate-pulse"></div>
          <div className="h-40 bg-muted rounded-lg animate-pulse" style={{ animationDelay: '0.1s' }}></div>
          <div className="h-40 bg-muted rounded-lg animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 animate-fade-in-down">
        <h1 className="text-2xl font-semibold mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Monitor your cryptographic identity and sealed content status.
        </p>
      </div>

      {/* Certificate Status Alert */}
      {!status?.provisioned && (
        <Alert className="mb-8 bg-warning/10 border-warning/25 animate-fade-in-up stagger-1">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Certificate Required</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span className="text-muted-foreground">You need to provision a certificate to seal and encrypt content.</span>
            <Button 
              onClick={handleProvision} 
              disabled={provisioning}
              size="sm"
              className="ml-4 transition-all hover:scale-105"
            >
              {provisioning ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Provisioning...
                </span>
              ) : 'Get Certificate'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-8 animate-shake">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Trust Health */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="security-card hover-lift animate-fade-in-up stagger-1">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">CA Status</p>
                <p className="text-sm text-muted-foreground">Certificate Authority</p>
              </div>
            </div>
            {pkiInfo?.initialized ? (
              <StatusBadge status="valid" label="Operational" />
            ) : (
              <Button 
                onClick={handleInitPKI} 
                disabled={initializingPKI}
                size="sm"
                variant="outline"
                className="transition-all hover:scale-105"
              >
                {initializingPKI ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Initializing...
                  </span>
                ) : 'Initialize PKI'}
              </Button>
            )}
          </div>
        </div>

        <div className="security-card hover-lift animate-fade-in-up stagger-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-secondary/15 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium">CRL Status</p>
                <p className="text-sm text-muted-foreground">Revocation list</p>
              </div>
            </div>
            <StatusBadge status="valid" label="Up to date" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="security-card hover-lift hover-glow animate-fade-in-up stagger-2">
          <div className="flex items-start justify-between mb-4">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Award className="h-5 w-5 text-success" />
            </div>
            {status?.provisioned ? (
              <StatusBadge status={status.certificate?.status === 'active' ? 'valid' : 'error'} label={status.certificate?.status || 'Unknown'} />
            ) : (
              <StatusBadge status="pending" label="Not Provisioned" />
            )}
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Certificate Status</h3>
          <p className="text-2xl font-semibold">{status?.provisioned ? 'Active' : 'None'}</p>
          {status?.certificate && (
            <p className="text-sm text-muted-foreground mt-1">
              Serial: {status.certificate.serial_number?.slice(0, 12)}...
            </p>
          )}
        </div>

        <div className="security-card hover-lift hover-glow animate-fade-in-up stagger-3">
          <div className="flex items-start justify-between mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSignature className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Sealed Content</h3>
          <p className="text-2xl font-semibold transition-all">{auditStats?.seal || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Documents signed</p>
        </div>

        <div className="security-card hover-lift hover-glow animate-fade-in-up stagger-4">
          <div className="flex items-start justify-between mb-4">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-info" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Encrypted Shares</h3>
          <p className="text-2xl font-semibold">{auditStats?.encrypt || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Secure shares sent</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 animate-fade-in-up stagger-5">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button 
            asChild 
            disabled={!status?.provisioned}
            className="transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
          >
            <Link href="/seal">
              <FileSignature className="h-4 w-4 mr-2" />
              Seal New Content
            </Link>
          </Button>
          <Button 
            variant="outline" 
            asChild
            className="transition-all hover:scale-105"
          >
            <Link href="/verify">
              <CheckCircle className="h-4 w-4 mr-2" />
              Verify Bundle
            </Link>
          </Button>
          <Button 
            variant="outline" 
            asChild
            className="transition-all hover:scale-105"
          >
            <Link href="/certificate">
              <Award className="h-4 w-4 mr-2" />
              View Certificate
            </Link>
          </Button>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="animate-fade-in-up stagger-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="security-card hover-lift">
          {auditStats && Object.keys(auditStats).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(auditStats).map(([action, count], index) => (
                <div 
                  key={action} 
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-all"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">{action.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No activity yet. Start by sealing some content!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
