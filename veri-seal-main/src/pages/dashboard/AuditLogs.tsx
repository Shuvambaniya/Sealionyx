import { useState } from "react";
import { Clock, FileSignature, CheckCircle, Lock, AlertTriangle, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AuditLog {
  id: string;
  timestamp: string;
  action: "seal" | "verify" | "encrypt" | "revoke" | "login" | "download";
  actor: string;
  target: string;
  result: "success" | "failure";
  details: string;
  ipAddress: string;
}

const auditLogs: AuditLog[] = [
  {
    id: "1",
    timestamp: "2024-01-24T10:30:00Z",
    action: "seal",
    actor: "John Doe",
    target: "AI Article #1247",
    result: "success",
    details: "Content sealed with certificate SN:7A:3F:2B:91. Hash: 3f7a9c2b1e4d...",
    ipAddress: "192.168.1.100",
  },
  {
    id: "2",
    timestamp: "2024-01-24T09:15:00Z",
    action: "verify",
    actor: "External User",
    target: "bundle_x7k2.json",
    result: "success",
    details: "Signature verification passed. Trust chain validated. No revocation detected.",
    ipAddress: "203.0.113.50",
  },
  {
    id: "3",
    timestamp: "2024-01-24T08:45:00Z",
    action: "encrypt",
    actor: "John Doe",
    target: "Report for Client A",
    result: "success",
    details: "Content encrypted for recipient: alice@example.com using hybrid encryption.",
    ipAddress: "192.168.1.100",
  },
  {
    id: "4",
    timestamp: "2024-01-23T16:20:00Z",
    action: "verify",
    actor: "External User",
    target: "unknown_bundle.json",
    result: "failure",
    details: "Signature verification failed: Hash mismatch detected. Content may have been tampered.",
    ipAddress: "198.51.100.42",
  },
  {
    id: "5",
    timestamp: "2024-01-23T14:00:00Z",
    action: "login",
    actor: "John Doe",
    target: "Account",
    result: "success",
    details: "Successful authentication via email/password.",
    ipAddress: "192.168.1.100",
  },
  {
    id: "6",
    timestamp: "2024-01-23T11:30:00Z",
    action: "download",
    actor: "John Doe",
    target: "Certificate",
    result: "success",
    details: "Certificate downloaded in PEM format.",
    ipAddress: "192.168.1.100",
  },
];

const actionIcons = {
  seal: FileSignature,
  verify: CheckCircle,
  encrypt: Lock,
  revoke: AlertTriangle,
  login: Clock,
  download: Clock,
};

const actionLabels = {
  seal: "Content Sealed",
  verify: "Verification",
  encrypt: "Encrypted",
  revoke: "Revoked",
  login: "Login",
  download: "Download",
};

export default function AuditLogs() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>("all");

  const filteredLogs = filterAction === "all" 
    ? auditLogs 
    : auditLogs.filter((log) => log.action === filterAction);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Audit Logs</h1>
        <p className="text-muted-foreground">
          Track all security events and actions on your account.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by action:</span>
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="seal">Seal</SelectItem>
            <SelectItem value="verify">Verify</SelectItem>
            <SelectItem value="encrypt">Encrypt</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="download">Download</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <div className="security-card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground w-10"></th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Time</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Action</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Actor</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Target</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Result</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => {
              const Icon = actionIcons[log.action];
              const isExpanded = expandedId === log.id;

              const jsonDetail = {
                id: log.id,
                timestamp: log.timestamp,
                action: log.action,
                actor: log.actor,
                target: log.target,
                result: log.result,
                ipAddress: log.ipAddress,
                details: log.details,
              };

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
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{actionLabels[log.action]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{log.actor}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{log.target}</td>
                    <td className="px-4 py-3">
                      {log.result === "success" ? (
                        <StatusBadge status="valid" label="Success" />
                      ) : (
                        <StatusBadge status="error" label="Failed" />
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${log.id}-details`} className="bg-muted/10">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="ml-10 space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-muted-foreground">JSON Detail</span>
                            <span className="text-xs text-muted-foreground">(expandable view)</span>
                          </div>
                          <pre className="rounded-lg border border-border bg-muted/20 p-4 text-xs overflow-auto">
{JSON.stringify(jsonDetail, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No audit logs found for the selected filter.
        </div>
      )}
    </div>
  );
}
