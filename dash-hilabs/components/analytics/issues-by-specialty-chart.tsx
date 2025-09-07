"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Loader2, AlertTriangle } from "lucide-react"

interface SpecialtyData {
  name: string
  value: number
  issues: number
  expired_licenses: number
  missing_npi: number
  phone_issues: number
  address_issues: number
  percentage: number
}

interface ProvidersData {
  specialty_data: SpecialtyData[]
  overall_stats: {
    total_providers: number
    total_specialties: number
    total_issues: number
    avg_issues_per_specialty: number
  }
  success: boolean
}

// Define colors for the chart
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8B5CF6",
  "#10B981",
  "#F59E0B", 
  "#EF4444",
  "#3B82F6",
  "#8B5A2B",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316"
]

export function IssuesBySpecialtyChart() {
  const [data, setData] = useState<ProvidersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showIssues, setShowIssues] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:8000/analytics/providers-by-specialty')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result: ProvidersData = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching providers by specialty data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-muted-foreground">Loading provider data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading data</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!data || !data.specialty_data || data.specialty_data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-muted-foreground">No provider specialty data available</p>
      </div>
    )
  }

  // Prepare data for the chart - show top 10 specialties
  const chartData = data.specialty_data.slice(0, 10).map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
    displayValue: showIssues ? item.issues : item.value,
    displayName: item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p>Providers: <span className="font-medium">{data.value.toLocaleString()}</span></p>
            <p>Percentage: <span className="font-medium">{data.percentage}%</span></p>
            {showIssues ? (
              <div className="mt-2 space-y-1 text-xs">
                <p className="font-medium text-destructive">Issues Breakdown:</p>
                <p>• Expired Licenses: {data.expired_licenses}</p>
                <p>• Missing NPI: {data.missing_npi}</p>
                <p>• Phone Issues: {data.phone_issues}</p>
                <p>• Address Issues: {data.address_issues}</p>
                <p className="font-medium">Total Issues: {data.issues}</p>
              </div>
            ) : (
              <p>Total Issues: <span className="font-medium text-destructive">{data.issues}</span></p>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Toggle Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowIssues(!showIssues)}
            className="flex items-center space-x-2 px-3 py-1 text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{showIssues ? 'Show Provider Count' : 'Show Issues'}</span>
          </button>
        </div>
        <div className="text-xs text-muted-foreground">
          {showIssues ? 'Issues by Specialty' : 'Providers by Specialty'}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie 
            data={chartData} 
            cx="50%" 
            cy="50%" 
            innerRadius={60} 
            outerRadius={100} 
            paddingAngle={2} 
            dataKey="displayValue"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={24}
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color }}>
                {entry.payload.displayName}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-3 bg-muted/50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-semibold text-primary">
            {data.overall_stats.total_providers.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Total Providers</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">
            {data.overall_stats.total_specialties}
          </div>
          <div className="text-xs text-muted-foreground">Specialties</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-destructive">
            {data.overall_stats.total_issues.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Total Issues</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-orange-600">
            {data.overall_stats.avg_issues_per_specialty}
          </div>
          <div className="text-xs text-muted-foreground">Avg Issues/Specialty</div>
        </div>
      </div>
    </div>
  )
}
