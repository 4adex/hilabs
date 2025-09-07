"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  { month: "Jan", score: 82.5 },
  { month: "Feb", score: 84.2 },
  { month: "Mar", score: 83.8 },
  { month: "Apr", score: 85.1 },
  { month: "May", score: 86.3 },
  { month: "Jun", score: 87.3 },
]

export function DataQualityChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="month" />
        <YAxis domain={[80, 90]} />
        <Tooltip
          formatter={(value) => [`${value}%`, "Quality Score"]}
          labelStyle={{ color: "hsl(var(--foreground))" }}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
