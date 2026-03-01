'use client'

import { usePathname } from "next/navigation"
import { ShieldCheck } from "lucide-react"

const titles: Record<string, string> = {
  "/dashboard": "Dashboard Overview",
  "/certificate": "My Certificate",
  "/seal": "Seal Content",
  "/verify": "Verify Content",
  "/encrypt": "Encrypt & Share",
  "/audit": "Audit Logs",
}

export function DashboardTopBar() {
  const pathname = usePathname()

  const title = titles[pathname] ?? "Dashboard"

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex h-14 items-center px-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Sealionyx</p>
            <h1 className="text-base font-semibold truncate">{title}</h1>
          </div>
        </div>
      </div>
    </header>
  )
}
