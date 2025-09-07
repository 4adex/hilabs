"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Activity,
  AlertTriangle,
  FileX,
  Copy,
  FileText,
  Phone,
  CheckCircle,
  XCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Bot,
  Settings,
  Upload,
  Home,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ProcessedData {
  clusters: Record<
    string,
    {
      members: number[]
      representative: number
    }
  >
  summary: {
    total_records: number
    candidate_pairs: number
    duplicate_pairs: number
    unique_involved: number
    ca_state: number
    clusters: number
    compliance_rate: number
    data_quality_score: number
    expired_licenses: number
    final_records: number
    formatting_issues: number
    missing_npi: number
    ny_state: number
    outliers_removed: number
    providers_available: number
  }
}

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const storedData = localStorage.getItem("processedData")
    if (storedData) {
      try {
        setProcessedData(JSON.parse(storedData))
      } catch (error) {
        console.error("Failed to parse stored data:", error)
      }
    }
  }, [])

  const navigationLinks = [
    { href: "/analytics", label: "Analytics Dashboard", icon: BarChart3 },
    { href: "/analytics/ai-chat", label: "AI Assistant", icon: Bot },
    { href: "/upload", label: "Upload New Data", icon: Upload },
  ]

  const dataQualityIssues = [
    { 
      icon: FileX, 
      label: "Expired Licenses", 
      count: processedData?.summary.expired_licenses || 471, 
      color: "text-orange-500" 
    },
    { 
      icon: Copy, 
      label: "Duplicate Records", 
      count: processedData?.summary.duplicate_pairs || 42, 
      color: "text-yellow-500" 
    },
    { 
      icon: FileText, 
      label: "Format Issues", 
      count: processedData?.summary.formatting_issues || 59, 
      color: "text-blue-500" 
    },
    { 
      icon: Phone, 
      label: "Missing NPI", 
      count: processedData?.summary.missing_npi || 510, 
      color: "text-purple-500" 
    },
  ]

  const networkAdequacy = [
    { label: "CMS Compliance", status: "success", icon: CheckCircle },
    { label: "State Requirements", count: 2, status: "warning", icon: XCircle },
  ]

  const geographicFilter = [
    { 
      label: "New York", 
      count: processedData?.summary.ny_state || 234 
    },
    { 
      label: "California", 
      count: processedData?.summary.ca_state || 189 
    },
  ]

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-card border-r transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className,
      )}
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-lg">HiLabs</span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8 p-0">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Navigation */}
        <div>
          {!collapsed && (
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Navigation
            </h3>
          )}
          <div className="space-y-1">
            {navigationLinks.map((link, index) => (
              <Link key={index} href={link.href}>
                <div
                  className={cn(
                    "flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer",
                    pathname === link.href
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted/50"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {!collapsed && <span className="text-sm font-medium">{link.label}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <Separator />

        {/* Data Quality Issues */}
        <div>
          {!collapsed && (
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Data Quality Issues
            </h3>
          )}
          <div className="space-y-2">
            {dataQualityIssues.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <item.icon className={cn("h-4 w-4", item.color)} />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </div>
                {!collapsed && (
                  <Badge variant="secondary" className="text-xs">
                    {item.count}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Geographic Filter */}
        <div>
          {!collapsed && (
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Geographic Filter
            </h3>
          )}
          <div className="space-y-2">
            {geographicFilter.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </div>
                {!collapsed && (
                  <Badge variant="secondary" className="text-xs">
                    {item.count}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
