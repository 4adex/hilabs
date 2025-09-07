'use client'

import { useState } from 'react'
import axios from 'axios'
import { Search, Database, Bot, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface QueryResult {
  question: string
  sql_query: string
  results: any[]
  success: boolean
  error?: string
}

interface HealthStatus {
  status: string
  database: string
  ai_model: string
}

export default function Home() {
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [activeTab, setActiveTab] = useState<'query' | 'employees' | 'departments' | 'projects'>('query')

  const checkHealth = async () => {
    try {
      const response = await axios.get(`${API_URL}/health`)
      setHealth(response.data)
    } catch (error) {
      console.error('Health check failed:', error)
      setHealth({
        status: 'error',
        database: 'unavailable',
        ai_model: 'unavailable'
      })
    }
  }

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    setIsLoading(true)
    try {
      const response = await axios.post(`${API_URL}/query`, {
        question: question.trim()
      })
      setResult(response.data)
    } catch (error) {
      console.error('Query failed:', error)
      setResult({
        question: question.trim(),
        sql_query: '',
        results: [],
        success: false,
        error: 'Failed to connect to the API'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchData = async (endpoint: string) => {
    try {
      const response = await axios.get(`${API_URL}/${endpoint}`)
      return response.data
    } catch (error) {
      console.error(`Failed to fetch ${endpoint}:`, error)
      return null
    }
  }

  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) {
      return <p className="text-gray-500">No data available</p>
    }

    const columns = Object.keys(data[0])
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row[column]?.toString() || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI Database Query Interface
          </h1>
          <p className="text-xl text-gray-600">
            Ask questions about your data in natural language
          </p>
        </div>

        {/* Health Check */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
            <button
              onClick={checkHealth}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Check Health
            </button>
          </div>
          
          {health && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                {health.status === 'healthy' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span>System: {health.status}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Database: {health.database}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>AI Model: {health.ai_model}</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {[
                { id: 'query', name: 'AI Query', icon: Search },
                { id: 'employees', name: 'Employees', icon: Database },
                { id: 'departments', name: 'Departments', icon: Database },
                { id: 'projects', name: 'Projects', icon: Database },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* AI Query Tab */}
            {activeTab === 'query' && (
              <div>
                <form onSubmit={handleQuery} className="mb-6">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask a question about your data (e.g., 'Show me all employees in the Engineering department')"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !question.trim()}
                      className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-2 px-6 rounded-md flex items-center space-x-2"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      <span>{isLoading ? 'Querying...' : 'Query'}</span>
                    </button>
                  </div>
                </form>

                {/* Query Results */}
                {result && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h3 className="font-semibold text-gray-900 mb-2">Question:</h3>
                      <p className="text-gray-700">{result.question}</p>
                    </div>

                    {result.sql_query && (
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="font-semibold text-gray-900 mb-2">Generated SQL:</h3>
                        <pre className="text-sm text-gray-700 overflow-x-auto">{result.sql_query}</pre>
                      </div>
                    )}

                    {result.success ? (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Results ({result.results.length} rows):</h3>
                        {renderTable(result.results)}
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          <h3 className="font-semibold text-red-900">Error:</h3>
                        </div>
                        <p className="text-red-700 mt-2">{result.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Data Display Tabs */}
            {activeTab !== 'query' && (
              <DataDisplayTab endpoint={activeTab} fetchData={fetchData} renderTable={renderTable} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DataDisplayTab({
  endpoint,
  fetchData,
  renderTable
}: {
  endpoint: string
  fetchData: (endpoint: string) => Promise<any>
  renderTable: (data: any[]) => JSX.Element
}) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleFetch = async () => {
    setIsLoading(true)
    try {
      const result = await fetchData(endpoint)
      setData(result)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 capitalize">{endpoint}</h2>
        <button
          onClick={handleFetch}
          disabled={isLoading}
          className="bg-green-500 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded flex items-center space-x-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          <span>{isLoading ? 'Loading...' : `Load ${endpoint}`}</span>
        </button>
      </div>

      {data && (
        <div>
          <p className="text-gray-600 mb-4">Found {data.count} records</p>
          {renderTable(data[endpoint])}
        </div>
      )}
    </div>
  )
}
