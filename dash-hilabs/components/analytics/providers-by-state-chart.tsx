"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Loader2, MapPin } from "lucide-react"

interface StateData {
  state: string
  providers: number
  percentage: number
}

interface StateDistributionData {
  state_data: StateData[]
  overall_stats: {
    total_providers: number
    total_states: number
    top_3_states: string[]
    top_3_count: number
    top_3_percentage: number
  }
  success: boolean
}

export function ProvidersByStateChart() {
  const [data, setData] = useState<StateDistributionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:8000/analytics/providers-by-state')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result: StateDistributionData = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching providers by state data:', err)
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
          <span className="text-muted-foreground">Loading state distribution data...</span>
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

  if (!data || !data.state_data || data.state_data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-muted-foreground">No state distribution data available</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p>Providers: <span className="font-medium text-primary">{data.providers.toLocaleString()}</span></p>
            <p>Percentage: <span className="font-medium">{data.percentage}%</span></p>
          </div>
        </div>
      )
    }
    return null
  }

  // Take top 10 states for better visualization
  const chartData = data.state_data.slice(0, 10)

  return (
    <div className="space-y-4">
      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="state" 
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="providers" 
            fill="hsl(var(--primary))" 
            radius={[4, 4, 0, 0]}
            opacity={0.8}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-semibold text-primary">
            {data.overall_stats.total_providers.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Total Providers</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">
            {data.overall_stats.total_states}
          </div>
          <div className="text-xs text-muted-foreground">States/Regions</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">
            {data.overall_stats.top_3_percentage}%
          </div>
          <div className="text-xs text-muted-foreground">Top 3 States</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-orange-600">
            {data.state_data[0]?.providers.toLocaleString() || 0}
          </div>
          <div className="text-xs text-muted-foreground">Largest State</div>
        </div>
      </div>
    </div>
  )
}
