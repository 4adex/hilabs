"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, MessageSquare, Sparkles } from "lucide-react"

export function NaturalLanguageQuery() {
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const suggestedQueries = [
    "What's our overall data quality score?",
    "Show providers with phone formatting issues",
    "Which specialties have the most issues?",
    "Generate compliance report for expired licenses",
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
    }, 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center font-heading">
          <MessageSquare className="w-5 h-5 mr-2" />
          Analytics Assistant
          <Badge variant="secondary" className="ml-2">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Ask me about your provider data quality, identify issues, and generate reports..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Analyzing..." : "Ask"}
          </Button>
        </form>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Suggested queries:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQueries.map((suggestion, index) => (
              <Button key={index} variant="outline" size="sm" onClick={() => setQuery(suggestion)} className="text-xs">
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
