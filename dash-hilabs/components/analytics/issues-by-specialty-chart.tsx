"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

const data = [
  { name: "Cardiology", value: 35, color: "hsl(var(--chart-1))" },
  { name: "Internal Medicine", value: 28, color: "hsl(var(--chart-2))" },
  { name: "Pulmonology", value: 22, color: "hsl(var(--chart-3))" },
  { name: "Neurology", value: 15, color: "hsl(var(--chart-4))" },
]

export function IssuesBySpecialtyChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${value} issues`, "Count"]}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
