"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Sidebar } from "@/components/layout/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  Bot, 
  Send, 
  Lightbulb, 
  MessageSquare, 
  FileText, 
  BarChart3, 
  AlertTriangle,
  Download,
  RefreshCw,
  Copy,
  ThumbsUp,
  ThumbsDown
} from "lucide-react"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  isLoading?: boolean
}

const suggestedQueries = [
  {
    category: "Data Quality",
    queries: [
      "How many providers have expired licenses?",
      "Show me providers with phone formatting issues",
      "Which providers have missing NPI numbers?",
      "Analyze data quality trends over the last 30 days"
    ]
  },
  {
    category: "Compliance & Risk",
    queries: [
      "Generate compliance report for expired licenses",
      "Show high-risk providers requiring immediate attention",
      "What's our current compliance rate by specialty?",
      "List providers with multiple data quality issues"
    ]
  },
  {
    category: "Analytics & Insights",
    queries: [
      "Which specialties have the most data issues?",
      "Show me duplicate detection results",
      "Analyze provider distribution by state",
      "What are the most common data quality problems?"
    ]
  },
  {
    category: "Reports & Export",
    queries: [
      "Export list of providers with expired licenses",
      "Generate monthly data quality summary",
      "Create specialty-wise compliance report",
      "Download provider contact validation results"
    ]
  }
]

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content: "Hello! I'm your Provider Analytics AI Assistant. I have access to your complete provider database and can help you with data quality analysis, compliance reporting, and generating insights. How can I assist you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Add loading message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content: "Analyzing your request...",
      timestamp: new Date(),
      isLoading: true,
    }
    setMessages((prev) => [...prev, loadingMessage])

    // Simulate AI response with more realistic delay
    setTimeout(() => {
      const responses = [
        `Based on your query "${input}", I've analyzed your provider database. Here are the key findings:

**Current Status:**
• Total providers analyzed: 1,247
• Providers with expired licenses: 23 (1.8%)
• Compliance rate: 94.3%

**Detailed Breakdown:**
- Cardiology: 8 expired licenses
- Internal Medicine: 6 expired licenses  
- Pulmonology: 4 expired licenses
- Other specialties: 5 expired licenses

**Recommended Actions:**
1. Immediate notification to providers with expired licenses
2. Set up automated renewal reminders
3. Review credentialing processes

Would you like me to generate a detailed compliance report or help you with the next steps?`,

        `I've processed your request and found the following insights:

**Data Quality Analysis Results:**
• Phone format issues: 45 providers (3.6%)
• Missing NPI numbers: 12 providers (0.9%)
• Address format problems: 31 providers (2.5%)

**Geographic Distribution:**
- California: 15 phone format issues
- New York: 12 phone format issues
- Texas: 8 phone format issues
- Other states: 10 phone format issues

**Impact Assessment:**
- High priority fixes needed: 18 providers
- Medium priority: 27 providers
- Low priority: 0 providers

I can help you export this data or create automated validation rules. What would you prefer?`,

        `Here's a comprehensive analysis of your provider data quality:

**Overall Health Score: 87.3%**

**Top Issues by Category:**
1. **License Management (Priority: High)**
   - 23 expired licenses requiring immediate renewal
   - 7 licenses expiring within 30 days
   
2. **Contact Information (Priority: Medium)**
   - 45 phone number formatting inconsistencies
   - 31 address standardization needs
   
3. **Professional Details (Priority: Low)**
   - 12 missing NPI numbers
   - 8 specialty classification updates needed

**Trend Analysis:**
- Data quality improved by 2.1% this month
- License compliance up 1.2% from last quarter
- New validation rules reduced errors by 15%

Would you like me to dive deeper into any specific area or generate action items?`
      ]

      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      
      setMessages((prev) => 
        prev.map((msg) => 
          msg.isLoading 
            ? { ...msg, content: randomResponse, isLoading: false }
            : msg
        )
      )
      setIsLoading(false)
    }, 2000)
  }

  const handleSuggestedQuery = (query: string) => {
    setInput(query)
    textareaRef.current?.focus()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
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
                  <Bot className="w-4 h-4 mr-2" />
                  AI ANALYTICS ASSISTANT
                </Badge>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-muted-foreground">AI Assistant Active</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Suggested Queries Sidebar */}
          <div className="w-96 border-r bg-card/30 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2" />
                  Suggested Queries
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click on any query to get started or use them as inspiration for your own questions.
                </p>
              </div>

              {suggestedQueries.map((category, categoryIndex) => (
                <div key={categoryIndex}>
                  <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center">
                    {category.category === "Data Quality" && <BarChart3 className="w-4 h-4 mr-2" />}
                    {category.category === "Compliance & Risk" && <AlertTriangle className="w-4 h-4 mr-2" />}
                    {category.category === "Analytics & Insights" && <MessageSquare className="w-4 h-4 mr-2" />}
                    {category.category === "Reports & Export" && <FileText className="w-4 h-4 mr-2" />}
                    {category.category}
                  </h4>
                  <div className="space-y-2">
                    {category.queries.map((query, queryIndex) => (
                      <Button
                        key={queryIndex}
                        variant="ghost"
                        className="w-full justify-start text-left text-sm h-auto p-3 hover:bg-muted/50 whitespace-normal leading-relaxed"
                        onClick={() => handleSuggestedQuery(query)}
                      >
                        {query}
                      </Button>
                    ))}
                  </div>
                  {categoryIndex < suggestedQueries.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-6 min-h-0">
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`flex max-w-[80%] ${message.type === "user" ? "flex-row-reverse" : "flex-row"} gap-3`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.type === "user" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      }`}>
                        {message.type === "user" ? (
                          <span className="text-sm font-medium">U</span>
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>

                      {/* Message Content */}
                      <div className={`flex flex-col ${message.type === "user" ? "items-end" : "items-start"}`}>
                        <div
                          className={`p-4 rounded-lg ${
                            message.type === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted border"
                          }`}
                        >
                          {message.isLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                              <span>Analyzing your request...</span>
                            </div>
                          ) : (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              {message.content.split('\n').map((line, index) => {
                                if (line.startsWith('**') && line.endsWith('**')) {
                                  return <div key={index} className="font-semibold mt-2 mb-1">{line.slice(2, -2)}</div>
                                }
                                if (line.startsWith('•') || line.startsWith('-')) {
                                  return <div key={index} className="ml-4">{line}</div>
                                }
                                if (line.trim() === '') {
                                  return <div key={index} className="h-2"></div>
                                }
                                return <div key={index}>{line}</div>
                              })}
                            </div>
                          )}
                        </div>
                        
                        {/* Message Actions */}
                        {!message.isLoading && message.type === "assistant" && (
                          <div className="flex items-center space-x-2 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyMessage(message.content)}
                              className="h-6 px-2 text-xs"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="flex-shrink-0 border-t bg-card/50 p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me about your provider data, compliance issues, or request analytics reports..."
                      className="min-h-[80px] resize-none"
                      disabled={isLoading}
                    />
                    <div className="text-xs text-muted-foreground mt-2">
                      Press Enter to send, Shift+Enter for new line
                    </div>
                  </div>
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!input.trim() || isLoading}
                    className="self-end"
                    size="lg"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
