import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/certificate": "My Certificate",
  "/dashboard/seal": "Seal Content",
  "/dashboard/verify": "Verify Content",
  "/dashboard/encrypt": "Encrypt & Share",
  "/dashboard/audit": "Audit Logs",
  "/dashboard/settings": "Settings",
};

export function DashboardTopBar() {
  const location = useLocation();

  const title = useMemo(() => {
    return titles[location.pathname] ?? "Dashboard";
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Sealionyx</p>
            <h1 className="text-base font-semibold truncate">{title}</h1>
          </div>
        </div>

        <Button variant="ghost" className="gap-2">
          <span className="text-sm">John Doe</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}
