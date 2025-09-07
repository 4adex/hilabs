"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sidebar } from "@/components/layout/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  Copy, 
  ChevronLeft, 
  AlertTriangle,
  Users,
  Activity,
  BarChart3,
  CheckCircle
} from "lucide-react"
import Link from "next/link"

interface Provider {
  provider_id: string | null
  npi: number | null
  full_name: string | null
  primary_specialty: string | null
  license_number: string | null
  license_state: string | null
}

interface Duplicate {
  i1: number | null
  i2: number | null
  provider_id_1: string | null
  provider_id_2: string | null
  name_1: string | null
  name_2: string | null
  score: number | null
  name_score: number | null
  npi_match: boolean | null
  addr_score: number | null
  phone_match: boolean | null
  license_score: number | null
}

interface ClusterInfo {
  cluster_id: string
  members: number[]
  representative: number
  providers: Provider[]
  duplicates: Duplicate[]
}

interface DuplicatesResponse {
  clusters: ClusterInfo[]
  total_clusters: number
  total_duplicates: number
}

export default function DuplicatesPage() {
  const [duplicatesData, setDuplicatesData] = useState<DuplicatesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDuplicates = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8000/duplicates')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch duplicates: ${response.statusText}`)
      }
      
      const data: DuplicatesResponse = await response.json()
      setDuplicatesData(data)
    } catch (err) {
      console.error("Error fetching duplicates:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch duplicates")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDuplicates()
  }, [])

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground"
    if (score >= 0.9) return "text-red-500"
    if (score >= 0.7) return "text-orange-500"
    if (score >= 0.5) return "text-yellow-500"
    return "text-green-500"
  }

  const getScoreBadgeVariant = (score: number | null) => {
    if (!score) return "secondary"
    if (score >= 0.9) return "destructive"
    if (score >= 0.7) return "destructive"
    if (score >= 0.5) return "secondary"
    return "default"
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
                <Link href="/analytics">
                  <Button variant="ghost" size="sm">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Analytics
                  </Button>
                </Link>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200">
                  DUPLICATE ANALYSIS
                </Badge>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-muted-foreground">
                    {duplicatesData ? `${duplicatesData.total_clusters} clusters analyzed` : "Loading..."}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <ThemeToggle />
                <Button size="sm" variant="outline" onClick={fetchDuplicates}>
                  <Activity className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Total Clusters</div>
                  <div className="text-2xl font-bold">{duplicatesData?.total_clusters || 0}</div>
                  <div className="text-xs text-muted-foreground">Similarity clusters analyzed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Similarity Pairs</div>
                  <div className="text-2xl font-bold">{duplicatesData?.total_duplicates || 0}</div>
                  <div className="text-xs text-muted-foreground">Provider similarity comparisons</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Analysis Status</div>
                  <div className="text-2xl font-bold">{loading ? "Loading..." : "Complete"}</div>
                  <div className="text-xs text-muted-foreground">
                    {error ? "Error occurred" : "Analysis completed"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Error Display */}
            {error && (
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Error:</span>
                    <span>{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              /* Clusters Display */
              <div className="space-y-6">
                {duplicatesData?.clusters.map((cluster) => (
                  <Card key={cluster.cluster_id} className="border-blue-200 dark:border-blue-800">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="w-5 h-5 text-blue-500" />
                          <span>Cluster {cluster.cluster_id.replace('cluster_', '')} Analysis</span>
                          <Badge variant="outline">
                            {cluster.duplicates.length} similarity pairs
                          </Badge>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          Representative Index: {cluster.representative}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Index 1</TableHead>
                              <TableHead>Provider 1</TableHead>
                              <TableHead>Index 2</TableHead>
                              <TableHead>Provider 2</TableHead>
                              <TableHead>Overall Score</TableHead>
                              <TableHead>Name Score</TableHead>
                              <TableHead>NPI Match</TableHead>
                              <TableHead>Address Score</TableHead>
                              <TableHead>Phone Match</TableHead>
                              <TableHead>License Score</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cluster.duplicates.map((duplicate, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-mono text-sm">{duplicate.i1}</TableCell>
                                <TableCell className="font-medium">{duplicate.name_1 || "N/A"}</TableCell>
                                <TableCell className="font-mono text-sm">{duplicate.i2}</TableCell>
                                <TableCell className="font-medium">{duplicate.name_2 || "N/A"}</TableCell>
                                <TableCell>
                                  <Badge variant={getScoreBadgeVariant(duplicate.score)}>
                                    {duplicate.score ? (duplicate.score * 100).toFixed(1) + "%" : "N/A"}
                                  </Badge>
                                </TableCell>
                                <TableCell className={getScoreColor(duplicate.name_score)}>
                                  {duplicate.name_score ? (duplicate.name_score * 100).toFixed(1) + "%" : "N/A"}
                                </TableCell>
                                <TableCell>
                                  {duplicate.npi_match === true ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : duplicate.npi_match === false ? (
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                  ) : (
                                    "N/A"
                                  )}
                                </TableCell>
                                <TableCell className={getScoreColor(duplicate.addr_score)}>
                                  {duplicate.addr_score ? (duplicate.addr_score * 100).toFixed(1) + "%" : "N/A"}
                                </TableCell>
                                <TableCell>
                                  {duplicate.phone_match === true ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : duplicate.phone_match === false ? (
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                  ) : (
                                    "N/A"
                                  )}
                                </TableCell>
                                <TableCell className={getScoreColor(duplicate.license_score)}>
                                  {duplicate.license_score ? (duplicate.license_score * 100).toFixed(1) + "%" : "N/A"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {duplicatesData?.clusters.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CheckCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Duplicate Clusters Found</h3>
                      <p className="text-muted-foreground">
                        No similarity clusters were detected in your provider data during the duplicate analysis process.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
