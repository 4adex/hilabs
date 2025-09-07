"use client"

import { Suspense, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileText, AlertTriangle, BarChart3, PieChart, Bot } from "lucide-react"
import { DataQualityChart } from "@/components/analytics/data-quality-chart"
import { IssuesBySpecialtyChart } from "@/components/analytics/issues-by-specialty-chart"
import { Sidebar } from "@/components/layout/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"

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
    clusters: number
    expired_licenses?: number
    compliance_rate?: number
    providers_available?: number
  }
}

// Mock data for records with most issues
const recordsWithIssues = [
  {
    id: "PR_00015",
    name: "Jennifer Lopez, MD PhD",
    specialty: "Cardiology",
    issues: ["Expired License", "Phone Format"],
    issueCount: 2,
    riskLevel: "high",
  },
  {
    id: "PR_00018",
    name: "David Clark, DO PhD",
    specialty: "Internal Medicine",
    issues: ["Duplicate Record", "Address Format"],
    issueCount: 2,
    riskLevel: "medium",
  },
  {
    id: "PR_00021",
    name: "Sarah Johnson, MD",
    specialty: "Pulmonology",
    issues: ["Missing NPI"],
    issueCount: 1,
    riskLevel: "low",
  },
  {
    id: "PR_00024",
    name: "Michael Brown, DO",
    specialty: "Cardiology",
    issues: ["Expired License", "Phone Format", "Address Format"],
    issueCount: 3,
    riskLevel: "high",
  },
]

export default function AnalyticsPage() {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null)

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

  const metrics = {
    dataQualityScore: processedData?.summary.compliance_rate || 87.3,
    totalProviders: processedData?.summary.total_records || 1247,
    criticalIssues: processedData?.summary.duplicate_pairs || 147,
    complianceRate: processedData?.summary.compliance_rate || 94.3,
    expiredLicensesCount: processedData?.summary.expired_licenses || 23,
    expiredLicensesPercent: processedData
      ? (((processedData.summary.expired_licenses || 0) / processedData.summary.total_records) * 100).toFixed(1)
      : "1.8",
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex-shrink-0 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  MCHECK PROVIDER ANALYTICS
                </Badge>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-muted-foreground">Real-time Validation Active</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <ThemeToggle />
                <Link href="/analytics/ai-chat">
                  <Button size="sm" className="bg-primary">
                    <Bot className="w-4 h-4 mr-2" />
                    Ask AI Assistant
                  </Button>
                </Link>
                <Button size="sm" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Compliance Report
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Dashboard Content */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">

            {/* Key Healthcare Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Data Quality Score</div>
                  <div className="text-2xl font-bold">{metrics.dataQualityScore}%</div>
                  <div className="text-xs text-green-600 dark:text-green-400">↑ 2.1% vs last week</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Total Providers</div>
                  <div className="text-2xl font-bold">{metrics.totalProviders.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Active in network</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Critical Issues</div>
                  <div className="text-2xl font-bold">{metrics.criticalIssues}</div>
                  <div className="text-xs text-red-600 dark:text-red-400">↑ 3 new this week</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Compliance Rate</div>
                  <div className="text-2xl font-bold">{metrics.complianceRate}%</div>
                  <div className="text-xs text-green-600 dark:text-green-400">↑ 1.2% improvement</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Expired Licenses</div>
                  <div className="text-2xl font-bold">{metrics.expiredLicensesPercent}%</div>
                  <div className="text-xs text-muted-foreground">
                    {metrics.expiredLicensesCount} of {metrics.totalProviders.toLocaleString()} providers
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compact Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Quick Filters</h3>
                  <div className="flex items-center space-x-3">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All States</SelectItem>
                        <SelectItem value="ca">California</SelectItem>
                        <SelectItem value="ny">New York</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Specialties</SelectItem>
                        <SelectItem value="cardiology">Cardiology</SelectItem>
                        <SelectItem value="internal">Internal Medicine</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select defaultValue="30">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center font-heading">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Provider Data Quality Trends
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Badge variant="outline">7D</Badge>
                    <Badge variant="default">30D</Badge>
                    <Badge variant="outline">90D</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<div className="h-[300px] bg-muted animate-pulse rounded" />}>
                    <DataQualityChart />
                  </Suspense>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center font-heading">
                    <PieChart className="w-5 h-5 mr-2" />
                    Issues by Specialty
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<div className="h-[300px] bg-muted animate-pulse rounded" />}>
                    <IssuesBySpecialtyChart />
                  </Suspense>
                </CardContent>
              </Card>
            </div>

            {/* Records with Most Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Records with Most Issues</CardTitle>
                <CardDescription>Providers requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recordsWithIssues.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            record.riskLevel === "high"
                              ? "bg-red-500"
                              : record.riskLevel === "medium"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                          }`}
                        />
                        <div>
                          <div className="font-medium">{record.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {record.specialty} • {record.id}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-wrap gap-1">
                          {record.issues.map((issue, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {issue}
                            </Badge>
                          ))}
                        </div>
                        <Badge variant={record.riskLevel === "high" ? "destructive" : "secondary"}>
                          {record.issueCount} issues
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
