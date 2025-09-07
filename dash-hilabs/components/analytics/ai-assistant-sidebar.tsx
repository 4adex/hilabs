"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, Lightbulb, X } from "lucide-react"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
}

interface AIAssistantSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function AIAssistantSidebar({ isOpen, onClose }: AIAssistantSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content:
        "Hi! I'm your Provider Analytics Assistant. I can help you analyze your provider data quality, identify issues, and generate reports. What would you like to know?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")

  const suggestedQueries = [
    "How many providers have expired licenses?",
    "Show providers with phone formatting issues",
    "Which specialties have the most issues?",
  ]

  const handleSendMessage = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `Based on your query "${input}", I found that there are currently 23 providers with expired licenses in your network. Would you like me to generate a detailed report or show you the specific providers?`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    }, 1000)

    setInput("")
  }

  const handleSuggestedQuery = (query: string) => {
    setInput(query)
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-background border-l shadow-lg z-50">
      <Card className="h-full flex flex-col border-0 rounded-none">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg font-heading">
              <Bot className="w-5 h-5 mr-2 text-primary" />
              Analytics Assistant
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Ask me about your provider data</p>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-4 space-y-4 min-h-0">
          <ScrollArea className="flex-1 pr-4 h-[calc(100vh-320px)]">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="space-y-2 flex-shrink-0">
            <div className="flex items-center text-xs font-medium text-muted-foreground">
              <Lightbulb className="w-3 h-3 mr-1" />
              Suggested Queries
            </div>
            <div className="grid grid-cols-1 gap-1">
              {suggestedQueries.map((query, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted text-xs py-1 px-2 justify-start text-left"
                  onClick={() => handleSuggestedQuery(query)}
                >
                  {query}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex space-x-2 flex-shrink-0">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your provider data..."
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1"
            />
            <Button size="sm" onClick={handleSendMessage} disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
