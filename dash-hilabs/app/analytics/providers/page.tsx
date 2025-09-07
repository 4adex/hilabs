"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sidebar } from "@/components/layout/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Users, ChevronLeft, ChevronRight, Search, Filter, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

interface Provider {
  provider_id: string | null
  npi: number | null
  full_name: string | null
  primary_specialty: string | null
  license_number: string | null
  license_state: string | null
}

interface ProvidersResponse {
  providers: Provider[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  
  const fetchProviders = async (page: number, limit: number) => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:8000/providers?page=${page}&limit=${limit}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch providers: ${response.statusText}`)
      }
      
      const data: ProvidersResponse = await response.json()
      setProviders(data.providers)
      setTotalPages(data.total_pages)
      setTotalRecords(data.total)
      setCurrentPage(data.page)
    } catch (err) {
      console.error("Error fetching providers:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch providers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviders(currentPage, pageSize)
  }, [currentPage, pageSize])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(parseInt(newSize))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  const filteredProviders = providers.filter(provider => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      provider.full_name?.toLowerCase().includes(searchLower) ||
      provider.provider_id?.toLowerCase().includes(searchLower) ||
      provider.primary_specialty?.toLowerCase().includes(searchLower) ||
      provider.license_state?.toLowerCase().includes(searchLower) ||
      provider.npi?.toString().includes(searchTerm)
    )
  })

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
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  PROVIDER DIRECTORY
                </Badge>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-muted-foreground">Live Data</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <ThemeToggle />
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Total Providers</div>
                  <div className="text-2xl font-bold">{totalRecords.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Current Page</div>
                  <div className="text-2xl font-bold">{currentPage} of {totalPages}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Showing</div>
                  <div className="text-2xl font-bold">{filteredProviders.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Per Page</div>
                  <div className="text-2xl font-bold">{pageSize}</div>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-1 items-center space-x-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search providers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Show:</span>
                    <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Provider Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center font-heading">
                  <Users className="w-5 h-5 mr-2" />
                  Provider Directory
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <p className="text-destructive mb-2">Error loading providers</p>
                      <p className="text-sm text-muted-foreground">{error}</p>
                      <Button 
                        onClick={() => fetchProviders(currentPage, pageSize)} 
                        variant="outline" 
                        className="mt-4"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Provider ID</TableHead>
                          <TableHead>NPI</TableHead>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Primary Specialty</TableHead>
                          <TableHead>License Number</TableHead>
                          <TableHead>License State</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProviders.map((provider, index) => (
                          <TableRow key={provider.provider_id || index}>
                            <TableCell className="font-mono text-sm">
                              {provider.provider_id || "N/A"}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {provider.npi || "N/A"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {provider.full_name || "N/A"}
                            </TableCell>
                            <TableCell>
                              {provider.primary_specialty ? (
                                <Badge variant="outline">
                                  {provider.primary_specialty}
                                </Badge>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {provider.license_number || "N/A"}
                            </TableCell>
                            <TableCell>
                              {provider.license_state ? (
                                <Badge variant="secondary">
                                  {provider.license_state}
                                </Badge>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} providers
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage <= 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (currentPage <= 3) {
                              pageNum = i + 1
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = currentPage - 2 + i
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
