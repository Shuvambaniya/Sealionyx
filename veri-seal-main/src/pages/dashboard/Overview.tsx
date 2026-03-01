import { Award, FileSignature, CheckCircle, Clock, ShieldCheck, Link2, Activity } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const recentActivity = [
  { id: 1, action: "Content sealed", target: "AI Article #1247", time: "2 hours ago", status: "success" },
  { id: 2, action: "Verification performed", target: "bundle_x7k2.json", time: "5 hours ago", status: "success" },
  { id: 3, action: "Encrypted content shared", target: "Report for Client A", time: "1 day ago", status: "success" },
  { id: 4, action: "Verification failed", target: "unknown_bundle.json", time: "2 days ago", status: "error" },
];

function ProgressBar({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className="h-full bg-primary" style={{ width: `${safe}%` }} />
    </div>
  );
}

export default function Overview() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Monitor your cryptographic identity and sealed content status.
        </p>
      </div>

      {/* Trust Health */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="security-card">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">CA Status</p>
                <p className="text-sm text-muted-foreground">Root + intermediate reachable</p>
              </div>
            </div>
            <StatusBadge status="valid" label="Operational" />
          </div>
        </div>

        <div className="security-card">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-secondary/15 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium">CRL Status</p>
                <p className="text-sm text-muted-foreground">Latest revocation list loaded</p>
              </div>
            </div>
            <StatusBadge status="valid" label="Up to date" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="security-card">
          <div className="flex items-start justify-between mb-4">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Award className="h-5 w-5 text-success" />
            </div>
            <StatusBadge status="valid" label="Valid" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Certificate Status</h3>
          <p className="text-2xl font-semibold">Active</p>
          <p className="text-sm text-muted-foreground mt-1">Expires in 364 days</p>
        </div>

        <div className="security-card">
          <div className="flex items-start justify-between mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSignature className="h-5 w-5 text-primary" />
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Sealed Content</h3>
          <p className="text-2xl font-semibold">47</p>
          <p className="text-sm text-muted-foreground mt-1">+12 this month</p>
        </div>

        <div className="security-card">
          <div className="flex items-start justify-between mb-4">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-info" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Verification Success Rate</h3>
          <p className="text-2xl font-semibold">96.2%</p>
          <div className="mt-3">
            <ProgressBar value={96.2} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">Last 30 days (n=78)</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/dashboard/seal">
              <FileSignature className="h-4 w-4 mr-2" />
              Seal New Content
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard/verify">
              <CheckCircle className="h-4 w-4 mr-2" />
              Verify Bundle
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard/certificate">
              <Award className="h-4 w-4 mr-2" />
              View Certificate
            </Link>
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Activity Timeline</h2>
        <div className="security-card">
          <div className="space-y-4">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.action}</p>
                    <p className="text-sm text-muted-foreground truncate">{item.target}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-muted-foreground">{item.time}</span>
                  {item.status === "success" ? (
                    <StatusBadge status="valid" label="Success" />
                  ) : (
                    <StatusBadge status="error" label="Failed" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
