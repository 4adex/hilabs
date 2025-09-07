"use client"

import { useEffect, useState } from "react"
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts"
import { Loader2 } from "lucide-react"

interface SpecialtyStats {
  specialty: string
  count: number
  min: number
  max: number
  q1: number
  median: number
  q3: number
  mean: number
  experience_data: number[]
}

interface SpecialtyExperienceData {
  specialty_stats: SpecialtyStats[]
  overall_stats: {
    total_providers: number
    specialties_count: number
    overall_mean: number
    overall_min: number
    overall_max: number
  }
  success: boolean
}

// Box plot component using SVG
const BoxPlot = ({ data, width, height }: { data: SpecialtyStats[], width: number, height: number }) => {
  const margin = { top: 20, right: 30, bottom: 120, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  if (!data || data.length === 0) return null

  // Calculate scales
  const maxExperience = Math.max(...data.map(d => d.max))
  const minExperience = Math.min(...data.map(d => d.min))
  const experienceRange = maxExperience - minExperience

  const xScale = (index: number) => margin.left + (index / data.length) * chartWidth + chartWidth / (data.length * 2)
  const yScale = (value: number) => margin.top + chartHeight - ((value - minExperience) / experienceRange) * chartHeight

  const boxWidth = Math.min(chartWidth / data.length * 0.6, 40)

  const colors = [
    "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", 
    "hsl(var(--chart-4))", "hsl(var(--chart-5))", "#8B5CF6", "#10B981", 
    "#F59E0B", "#EF4444", "#3B82F6", "#8B5A2B", "#EC4899", "#06B6D4",
    "#84CC16", "#F97316"
  ]

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Y-axis */}
      <line
        x1={margin.left}
        y1={margin.top}
        x2={margin.left}
        y2={margin.top + chartHeight}
        stroke="hsl(var(--border))"
        strokeWidth={1}
      />
      
      {/* X-axis */}
      <line
        x1={margin.left}
        y1={margin.top + chartHeight}
        x2={margin.left + chartWidth}
        y2={margin.top + chartHeight}
        stroke="hsl(var(--border))"
        strokeWidth={1}
      />

      {/* Y-axis labels */}
      {[0, 10, 20, 30, 40, 50, 60].map(year => {
        if (year >= minExperience && year <= maxExperience) {
          return (
            <g key={year}>
              <line
                x1={margin.left - 5}
                y1={yScale(year)}
                x2={margin.left + chartWidth}
                y2={yScale(year)}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                opacity={0.3}
              />
              <text
                x={margin.left - 10}
                y={yScale(year) + 4}
                textAnchor="end"
                className="text-xs fill-muted-foreground"
              >
                {year}
              </text>
            </g>
          )
        }
        return null
      })}

      {/* Box plots */}
      {data.map((specialty, index) => {
        const x = xScale(index)
        const color = colors[index % colors.length]
        
        // Box plot elements
        const q1Y = yScale(specialty.q1)
        const medianY = yScale(specialty.median)
        const q3Y = yScale(specialty.q3)
        const minY = yScale(specialty.min)
        const maxY = yScale(specialty.max)
        
        return (
          <g key={specialty.specialty}>
            {/* Whiskers */}
            <line x1={x} y1={minY} x2={x} y2={q1Y} stroke={color} strokeWidth={2} />
            <line x1={x} y1={q3Y} x2={x} y2={maxY} stroke={color} strokeWidth={2} />
            
            {/* Whisker caps */}
            <line x1={x - 8} y1={minY} x2={x + 8} y2={minY} stroke={color} strokeWidth={2} />
            <line x1={x - 8} y1={maxY} x2={x + 8} y2={maxY} stroke={color} strokeWidth={2} />
            
            {/* Box */}
            <rect
              x={x - boxWidth/2}
              y={q3Y}
              width={boxWidth}
              height={q1Y - q3Y}
              fill={color}
              fillOpacity={0.3}
              stroke={color}
              strokeWidth={2}
            />
            
            {/* Median line */}
            <line
              x1={x - boxWidth/2}
              y1={medianY}
              x2={x + boxWidth/2}
              y2={medianY}
              stroke={color}
              strokeWidth={3}
            />
            
            {/* Mean point */}
            <circle
              cx={x}
              cy={yScale(specialty.mean)}
              r={3}
              fill="white"
              stroke={color}
              strokeWidth={2}
            />
          </g>
        )
      })}

      {/* X-axis labels */}
      {data.map((specialty, index) => {
        const x = xScale(index)
        const truncatedName = specialty.specialty.length > 12 
          ? specialty.specialty.substring(0, 12) + "..."
          : specialty.specialty
        
        return (
          <text
            key={specialty.specialty}
            x={x}
            y={margin.top + chartHeight + 20}
            textAnchor="middle"
            className="text-xs fill-muted-foreground"
            transform={`rotate(-45, ${x}, ${margin.top + chartHeight + 20})`}
          >
            {truncatedName}
          </text>
        )
      })}

      {/* Y-axis title */}
      <text
        x={20}
        y={margin.top + chartHeight / 2}
        textAnchor="middle"
        className="text-sm fill-muted-foreground font-medium"
        transform={`rotate(-90, 20, ${margin.top + chartHeight / 2})`}
      >
        Years in Practice
      </text>

      {/* Chart title */}
      <text
        x={margin.left + chartWidth / 2}
        y={15}
        textAnchor="middle"
        className="text-sm fill-foreground font-semibold"
      >
        Experience Distribution by Specialty
      </text>
    </svg>
  )
}

export function SpecialtyExperienceChart() {
  const [data, setData] = useState<SpecialtyExperienceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:8000/analytics/specialty-experience')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result: SpecialtyExperienceData = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching specialty experience data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-muted-foreground">Loading specialty experience data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading data</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!data || !data.specialty_stats || data.specialty_stats.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">No specialty experience data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={400}>
        <BoxPlot data={data.specialty_stats} width={800} height={400} />
      </ResponsiveContainer>
      
      {/* Summary Statistics */}
      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-semibold mb-2">Experience Distribution Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Providers:</span>
            <span className="ml-2 font-medium">{data.overall_stats.total_providers.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Specialties:</span>
            <span className="ml-2 font-medium">{data.overall_stats.specialties_count}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg Experience:</span>
            <span className="ml-2 font-medium">{data.overall_stats.overall_mean.toFixed(1)} years</span>
          </div>
          <div>
            <span className="text-muted-foreground">Experience Range:</span>
            <span className="ml-2 font-medium">
              {data.overall_stats.overall_min} - {data.overall_stats.overall_max} years
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
