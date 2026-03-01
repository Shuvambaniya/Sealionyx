'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "@/components/Logo"
import {
  LayoutDashboard,
  Award,
  FileSignature,
  CheckCircle,
  Lock,
  ClipboardList,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Award, label: "My Certificate", href: "/certificate" },
  { icon: FileSignature, label: "Seal AI Content", href: "/seal" },
  { icon: CheckCircle, label: "Verify Content", href: "/verify" },
  { icon: Lock, label: "Encrypt & Share", href: "/encrypt" },
  { icon: ClipboardList, label: "Audit Logs", href: "/audit" },
]

interface DashboardSidebarProps {
  user?: { email?: string } | null
  onSignOut: () => void
}

export function DashboardSidebar({ user, onSignOut }: DashboardSidebarProps) {
  const pathname = usePathname()

  const getInitials = (email?: string) => {
    if (!email) return "?"
    return email.substring(0, 2).toUpperCase()
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-40 animate-fade-in-left">
      <div className="p-6">
        <Logo variant="light" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href || 
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 hover:translate-x-1"
              }`}
              style={{ animationDelay: `${0.05 * index}s` }}
            >
              <item.icon className={`h-4 w-4 transition-transform ${isActive ? 'scale-110' : ''}`} />
              {item.label}
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg hover:bg-sidebar-accent/30 transition-colors">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <span className="text-xs font-medium text-white">
              {getInitials(user?.email)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email || "User"}
            </p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all hover:translate-x-1"
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
