'use client'

import { useEffect, useState } from 'react'
import { 
  ClipboardList, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Clock,
  FileSignature,
  Lock,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { createBrowserClient } from '@/lib/supabase'
import { getAuditLogs, getAuditStats } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { AuditLogEntry } from '@/types'

const actionLabels: Record<string, string> = {
  pki_setup: 'PKI Setup',
  user_provision: 'Certificate Provisioned',
  auth_verify: 'Auth Challenge',
  seal: 'Content Sealed',
  verify: 'Verification',
  encrypt: 'Encrypted',
  decrypt: 'Decrypted',
  revoke: 'Revoked',
}

const actionIcons: Record<string, any> = {
  pki_setup: Clock,
  user_provision: Clock,
  auth_verify: Clock,
  seal: FileSignature,
  verify: CheckCircle,
  encrypt: Lock,
  decrypt: Lock,
  revoke: AlertTriangle,
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const pageSize = 20

  const supabase = createBrowserClient()

  useEffect(() => {
    loadData()
  }, [filter, page])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const token = session.access_token

      const logsRes = await getAuditLogs(token, {
        action: filter || undefined,
        page,
        page_size: pageSize,
      })
      
      if (logsRes.data) {
        setLogs(logsRes.data.logs || [])
        setTotal(logsRes.data.total || 0)
      }

      if (!stats) {
        const statsRes = await getAuditStats(token)
        if (statsRes.data?.by_action) {
          setStats(statsRes.data.by_action)
        }
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadData()
  }

  const handleFilterChange = (action: string | null) => {
    setFilter(action)
    setPage(1)
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Audit Logs</h1>
        <p className="text-muted-foreground">
          Track all security events and actions on your account.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="security-card">
            <div className="text-2xl font-bold text-success">{stats.seal || 0}</div>
            <p className="text-sm text-muted-foreground">Documents Sealed</p>
          </div>
          <div className="security-card">
            <div className="text-2xl font-bold text-info">{stats.verify || 0}</div>
            <p className="text-sm text-muted-foreground">Verifications</p>
          </div>
          <div className="security-card">
            <div className="text-2xl font-bold text-warning">{stats.encrypt || 0}</div>
            <p className="text-sm text-muted-foreground">Encryptions</p>
          </div>
          <div className="security-card">
            <div className="text-2xl font-bold text-secondary">{stats.decrypt || 0}</div>
            <p className="text-sm text-muted-foreground">Decryptions</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by action:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange(null)}
          >
            All
          </Button>
          {['seal', 'verify', 'encrypt', 'decrypt'].map((action) => (
            <Button
              key={action}
              variant={filter === action ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange(action)}
            >
              {actionLabels[action] || action}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="ml-auto">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Logs Table */}
      <div className="security-card overflow-hidden p-0">
        {loading && logs.length === 0 ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="h-10 bg-muted rounded flex-1"></div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground w-10"></th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Time</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Details</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Result</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const Icon = actionIcons[log.action] || Clock
                const isExpanded = expandedId === log.id

                return (
                  <>
                    <tr 
                      key={log.id} 
                      className="border-b border-border hover:bg-muted/20 cursor-pointer"
                      onClick={() => toggleExpand(log.id)}
                    >
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(log.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{actionLabels[log.action] || log.action}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {log.details?.message || log.details?.bundle_id || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {log.result === 'success' ? (
                          <StatusBadge status="valid" label="Success" />
                        ) : (
                          <StatusBadge status="error" label="Failed" />
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${log.id}-details`} className="bg-muted/10">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="ml-10 space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-muted-foreground">JSON Detail</span>
                            </div>
                            <pre className="rounded-lg border border-border bg-muted/20 p-4 text-xs overflow-auto">
{JSON.stringify({
  id: log.id,
  action: log.action,
  result: log.result,
  created_at: log.created_at,
  details: log.details,
}, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
