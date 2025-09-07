"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  ThumbsDown,
  Database
} from "lucide-react"

interface QueryResult {
  question: string
  sql_query: string
  results: any[]
  success: boolean
  error?: string
}

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  isLoading?: boolean
  queryResult?: QueryResult
}

const suggestedQueries = [
  {
    category: "Data Quality",
    queries: [
      "How many providers have expired licenses?",
      "Show me providers with missing NPI numbers",
      "Which providers have formatting issues in phone numbers?",
      "Find all providers with missing primary specialty"
    ]
  },
  {
    category: "Duplicate Detection", 
    queries: [
      "Show me all duplicate provider pairs",
      "Find duplicates with high name similarity scores",
      "Which providers have NPI matches in duplicates?",
      "List duplicate clusters with address score above 0.8"
    ]
  },
  {
    category: "Provider Analytics",
    queries: [
      "Show provider distribution by specialty",
      "List providers by practice state",
      "Find board certified providers in California",
      "Show providers accepting new patients"
    ]
  },
  {
    category: "Compliance & Licensing",
    queries: [
      "List providers with licenses expiring soon",
      "Find providers without license numbers", 
      "Show license distribution by state",
      "Find providers with expired licenses"
    ]
  }
]

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content: "Hello! I'm your Provider Database AI Assistant. I can help you query your provider data using natural language. I have access to your merged provider roster and duplicate detection results. Ask me anything about your healthcare provider data!",
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
    const currentInput = input
    setInput("")
    setIsLoading(true)

    // Add loading message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content: "Analyzing your query and generating SQL...",
      timestamp: new Date(),
      isLoading: true,
    }
    setMessages((prev) => [...prev, loadingMessage])

    try {
      // Call the backend API
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentInput
        }),
      })

      const result: QueryResult = await response.json()

      if (result.success && result.results.length > 0) {
        // Create response message with query results
        const responseMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: "assistant",
          content: `I found ${result.results.length} result(s) for your query. Here's the data:`,
          timestamp: new Date(),
          queryResult: result,
        }

        setMessages((prev) => 
          prev.map((msg) => 
            msg.isLoading ? responseMessage : msg
          )
        )
      } else if (result.success && result.results.length === 0) {
        // No results found
        const responseMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: "assistant", 
          content: `Query executed successfully, but no results were found.`,
          timestamp: new Date(),
          queryResult: result,
        }

        setMessages((prev) => 
          prev.map((msg) => 
            msg.isLoading ? responseMessage : msg
          )
        )
      } else {
        // Error in query execution
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: "assistant",
          content: `I encountered an error while processing your query: ${result.error || 'Unknown error'}`,
          timestamp: new Date(),
          queryResult: result,
        }

        setMessages((prev) => 
          prev.map((msg) => 
            msg.isLoading ? errorMessage : msg
          )
        )
      }
    } catch (error) {
      // Network or other error
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: "assistant",
        content: `I couldn't connect to the database. Please make sure the backend service is running.`,
        timestamp: new Date(),
      }

      setMessages((prev) => 
        prev.map((msg) => 
          msg.isLoading ? errorMessage : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
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

  const copySqlQuery = (query: string) => {
    navigator.clipboard.writeText(query)
  }

  const exportTableData = (data: any[]) => {
    if (data.length === 0) return
    
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          // Escape commas and quotes in CSV
          if (value === null || value === undefined) return ''
          const stringValue = String(value)
          if (stringValue.includes(',') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'query_results.csv'
    a.click()
    window.URL.revokeObjectURL(url)
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
                    {category.category === "Duplicate Detection" && <AlertTriangle className="w-4 h-4 mr-2" />}
                    {category.category === "Provider Analytics" && <MessageSquare className="w-4 h-4 mr-2" />}
                    {category.category === "Compliance & Licensing" && <FileText className="w-4 h-4 mr-2" />}
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
                              <span>Analyzing your query and generating SQL...</span>
                            </div>
                          ) : (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              {message.content}
                            </div>
                          )}
                        </div>

                        {/* Query Results Table */}
                        {message.queryResult && message.queryResult.success && (
                          <div className="mt-4 w-full max-w-4xl">
                            {/* SQL Query Display */}
                            <div className="mb-4">
                              <div className="text-sm text-muted-foreground mb-2 flex items-center justify-between">
                                <div className="flex items-center">
                                  <Database className="w-4 h-4 mr-2" />
                                  Generated SQL Query:
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copySqlQuery(message.queryResult!.sql_query)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy SQL
                                </Button>
                              </div>
                              <div className="bg-slate-900 text-slate-100 p-3 rounded-md text-sm font-mono overflow-x-auto">
                                {message.queryResult.sql_query}
                              </div>
                            </div>

                            {/* Results Table */}
                            {message.queryResult.results.length > 0 ? (
                              <div className="border rounded-lg overflow-hidden">
                                <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
                                  <div className="text-sm font-medium">
                                    Query Results ({message.queryResult.results.length} rows)
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => exportTableData(message.queryResult!.results)}
                                    className="h-6 px-2 text-xs"
                                  >
                                    <Download className="w-3 h-3 mr-1" />
                                    Export CSV
                                  </Button>
                                </div>
                                <div className="overflow-x-auto max-h-96">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        {Object.keys(message.queryResult.results[0]).map((header) => (
                                          <TableHead key={header} className="font-medium">
                                            {header}
                                          </TableHead>
                                        ))}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {message.queryResult.results.map((row, index) => (
                                        <TableRow key={index}>
                                          {Object.values(row).map((value, cellIndex) => (
                                            <TableCell key={cellIndex} className="text-sm">
                                              {value !== null && value !== undefined 
                                                ? String(value) 
                                                : <span className="text-muted-foreground italic">null</span>
                                              }
                                            </TableCell>
                                          ))}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            ) : (
                              <Alert>
                                <AlertDescription>
                                  Query executed successfully, but returned no results.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}

                        {/* Error Display */}
                        {message.queryResult && !message.queryResult.success && (
                          <div className="mt-4 w-full max-w-4xl">
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                <div className="space-y-2">
                                  <div>Error: {message.queryResult.error}</div>
                                  {message.queryResult.sql_query && (
                                    <div>
                                      <div className="text-sm font-medium mb-1">Generated SQL:</div>
                                      <div className="bg-red-950 text-red-100 p-2 rounded text-sm font-mono">
                                        {message.queryResult.sql_query}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
                        
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
                      placeholder="Ask me about your provider database, duplicates, compliance, or request specific data queries..."
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
