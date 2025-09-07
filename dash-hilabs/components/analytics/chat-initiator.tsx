"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MessageCircle, Sparkles } from "lucide-react"

interface ChatInitiatorProps {
  onOpenChat: () => void
}

export function ChatInitiator({ onOpenChat }: ChatInitiatorProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">AI Analytics Assistant</h3>
              <p className="text-sm text-muted-foreground">
                Ask questions about your provider data quality and get instant insights
              </p>
            </div>
          </div>
          <Button
            onClick={onOpenChat}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="bg-primary hover:bg-primary/90 transition-all duration-200"
            size="sm"
          >
            <MessageCircle
              className={`w-4 h-4 mr-2 transition-transform duration-200 ${isHovered ? "scale-110" : ""}`}
            />
            Start Chat
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
