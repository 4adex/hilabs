"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, CheckCircle, Activity } from "lucide-react"
import { useRouter } from "next/navigation"

interface ProcessedData {
  clusters: Record<
    string,
    {
      members: number[]
      representative: number
    }
  >
  summary: {
    total_records: number
    candidate_pairs: number
    duplicate_pairs: number
    unique_involved: number
    clusters: number
    expired_licenses?: number
    compliance_rate?: number
    providers_available?: number
  }
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setUploadComplete(false)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      // Simulate progress while uploading
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90))
      }, 100)

      const response = await fetch("http://localhost:8000/process_csv", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(95)

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const data: ProcessedData = await response.json()
      setProcessedData(data)

      // Store data in localStorage for analytics page
      localStorage.setItem("processedData", JSON.stringify(data))

      setProgress(100)
      setUploadComplete(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const handleProceedToAnalytics = () => {
    router.push("/analytics")
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground">HiLabs</h1>
          </div>
          <p className="text-muted-foreground">Provider Analytics Platform</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Upload Provider Data</CardTitle>
            <CardDescription>
              Upload your CSV file containing provider information for analysis and quality assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!uploadComplete ? (
              <>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Choose a CSV file to upload</p>
                    <p className="text-xs text-muted-foreground">
                      Supported format: CSV files with provider information
                    </p>
                  </div>
                  <Input type="file" accept=".csv" onChange={handleFileChange} className="mt-4 max-w-xs mx-auto" />
                </div>

                {file && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      Selected file: <strong>{file.name}</strong> ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
                  {uploading ? "Processing..." : "Upload and Process"}
                </Button>
              </>
            ) : (
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-primary mx-auto" />
                <div>
                  <h3 className="text-lg font-heading font-semibold">Upload Complete!</h3>
                  <p className="text-muted-foreground">Your provider data has been processed successfully</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-muted/50 p-3 rounded">
                    <div className="font-medium">Records Processed</div>
                    <div className="text-2xl font-bold text-primary">{processedData?.summary.total_records || 0}</div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded">
                    <div className="font-medium">Duplicates Found</div>
                    <div className="text-2xl font-bold text-destructive">
                      {processedData?.summary.duplicate_pairs || 0}
                    </div>
                  </div>
                </div>
                <Button onClick={handleProceedToAnalytics} className="w-full">
                  View Analytics Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
