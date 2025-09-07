"use client"

import { Suspense, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileText, AlertTriangle, BarChart3, PieChart, Bot, Users } from "lucide-react"
import { DataQualityChart } from "@/components/analytics/data-quality-chart"
import { IssuesBySpecialtyChart } from "@/components/analytics/issues-by-specialty-chart"
import { SpecialtyExperienceChart } from "@/components/analytics/specialty-experience-chart"
import { ProvidersByStateChart } from "@/components/analytics/providers-by-state-chart"
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
    dataQualityScore: processedData?.summary.data_quality_score || 86.87,
    totalProviders: processedData?.summary.total_records || 524,
    criticalIssues: processedData?.summary.duplicate_pairs || 42,
    complianceRate: processedData?.summary.compliance_rate || 187.21,
    expiredLicensesCount: processedData?.summary.expired_licenses || 471,
    expiredLicensesPercent: processedData
      ? (((processedData.summary.expired_licenses || 0) / processedData.summary.total_records) * 100).toFixed(1)
      : "89.9",
    candidatePairs: processedData?.summary.candidate_pairs || 46229,
    totalClusters: processedData?.summary.clusters || 33,
    uniqueInvolved: processedData?.summary.unique_involved || 71,
    providersAvailable: processedData?.summary.providers_available || 170,
    formattingIssues: processedData?.summary.formatting_issues || 59,
    missingNpi: processedData?.summary.missing_npi || 510,
    finalRecords: processedData?.summary.final_records || 510,
    outliersRemoved: processedData?.summary.outliers_removed || 0,
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
                <Link href="/analytics/providers">
                  <Button size="sm" variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    View All Providers
                  </Button>
                </Link>
                <Link href="/analytics/duplicates">
                  <Button size="sm" variant="outline">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    View Duplication Analysis
                  </Button>
                </Link>
                <Link href="/analytics/ai-chat">
                  <Button size="sm" className="bg-primary">
                    <Bot className="w-4 h-4 mr-2" />
                    Ask AI Assistant
                  </Button>
                </Link>
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
                  <div className="text-xs">
                    {metrics.dataQualityScore >= 90 ? (
                      <span className="text-green-600 dark:text-green-400">Excellent</span>
                    ) : metrics.dataQualityScore >= 80 ? (
                      <span className="text-blue-600 dark:text-blue-400">Good Enough</span>
                    ) : metrics.dataQualityScore >= 70 ? (
                      <span className="text-yellow-600 dark:text-yellow-400">Needs Improvement</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">Critical</span>
                    )}
                  </div>
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
                  <div className="text-sm font-medium text-muted-foreground mb-1">Providers Available</div>
                  <div className="text-2xl font-bold">{metrics.providersAvailable}</div>
                  <div className="text-xs text-muted-foreground">
                    {((metrics.providersAvailable / metrics.totalProviders) * 100).toFixed(1)}% of total providers
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Compliance Rate</div>
                  <div className="text-2xl font-bold">{metrics.complianceRate}%</div>
                    <div className="text-xs">
                    {metrics.complianceRate >= 50 ? (
                      <span className="text-green-600 dark:text-green-400">Above target</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">Below target</span>
                    )}
                    </div>
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

            {/* Data Summary Section */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                      Data Summary & Insights
                    </h3>
                    <div className="prose prose-sm text-muted-foreground mb-4 max-w-none">
                      <p className="mb-2">
                        Your provider network currently has <strong className="text-foreground">{metrics.totalProviders.toLocaleString()} total providers</strong> with 
                        a <strong className="text-foreground">{metrics.dataQualityScore}% data quality score</strong>. Key areas requiring attention include:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li><strong className="text-foreground">{metrics.expiredLicensesPercent}%</strong> of providers have expired licenses ({metrics.expiredLicensesCount} providers)</li>
                        <li><strong className="text-foreground">{metrics.missingNpi.toLocaleString()}</strong> providers are missing NPI numbers</li>
                        <li><strong className="text-foreground">{metrics.formattingIssues}</strong> providers have formatting issues in their contact information</li>
                        <li>Current compliance rate stands at <strong className="text-foreground">{metrics.complianceRate}%</strong></li>
                      </ul>
                      <p className="mt-3 text-sm">
                        The system has identified <strong className="text-foreground">{metrics.totalClusters} duplicate clusters</strong> affecting 
                        <strong className="text-foreground"> {metrics.uniqueInvolved} providers</strong>, with <strong className="text-foreground">{metrics.providersAvailable}</strong> providers 
                        currently available for patient scheduling.
                      </p>
                    </div>
                  </div>
                  <div className="ml-6 flex flex-col items-end space-y-3">
                    <Link href="/analytics/ai-chat">
                      <Button size="lg" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg">
                        <Bot className="w-5 h-5 mr-2" />
                        Chat for More Details
                      </Button>
                    </Link>
                    <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                      Get AI-powered insights and detailed analysis of your provider data
                    </p>
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
                    Provider Distribution by State
                  </CardTitle>
                  <CardDescription>
                    Geographic distribution of healthcare providers across states
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<div className="h-[300px] bg-muted animate-pulse rounded" />}>
                    <ProvidersByStateChart />
                  </Suspense>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center font-heading">
                    <PieChart className="w-5 h-5 mr-2" />
                    Provider Distribution by Specialty
                  </CardTitle>
                  <CardDescription>
                    Interactive view of provider count and data quality issues across medical specialties
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<div className="h-[300px] bg-muted animate-pulse rounded" />}>
                    <IssuesBySpecialtyChart />
                  </Suspense>
                </CardContent>
              </Card>
            </div>

            {/* Experience Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center font-heading">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Provider Experience Distribution by Specialty
                </CardTitle>
                <CardDescription>
                  Box plot showing the distribution of years in practice across different medical specialties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-[400px] bg-muted animate-pulse rounded" />}>
                  <SpecialtyExperienceChart />
                </Suspense>
              </CardContent>
            </Card>

            Records with Most Issues
            {/* <Card>
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
            </Card> */}
          </div>
        </div>
      </div>
    </div>
  )
}
