"use client"

import { useEffect, useState, useRef } from "react"
import { Loader2, Info } from "lucide-react"

interface NetworkNode {
  id: number
  name: string
  specialty: string
  state: string
  city: string
  npi: string
  cluster_id: string | null
}

interface NetworkEdge {
  source: number
  target: number
  weight: number
  name_score: number
  npi_match: boolean
  addr_score: number
  phone_match: boolean
  license_score: number
  similarity_level: 'high' | 'medium' | 'low'
}

interface Cluster {
  id: string
  members: number[]
  representative: number
  size: number
}

interface NetworkData {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  clusters: Cluster[]
  statistics: {
    total_nodes: number
    total_edges: number
    total_clusters: number
    largest_cluster: number
    average_similarity: number
  }
  success: boolean
}

// Simple force-directed layout simulation
class ForceSimulation {
  nodes: Array<NetworkNode & { x: number; y: number; vx: number; vy: number }>
  edges: NetworkEdge[]
  width: number
  height: number

  constructor(nodes: NetworkNode[], edges: NetworkEdge[], width: number, height: number) {
    this.width = width
    this.height = height
    this.edges = edges
    
    // Initialize node positions
    this.nodes = nodes.map(node => ({
      ...node,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0
    }))
  }

  tick() {
    const alpha = 0.1
    const centerForce = 0.01
    const repelForce = 1000
    const linkForce = 0.5
    const centerX = this.width / 2
    const centerY = this.height / 2

    // Reset forces
    this.nodes.forEach(node => {
      node.vx = 0
      node.vy = 0
    })

    // Center force
    this.nodes.forEach(node => {
      node.vx += (centerX - node.x) * centerForce
      node.vy += (centerY - node.y) * centerForce
    })

    // Repulsion force
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const nodeA = this.nodes[i]
        const nodeB = this.nodes[j]
        const dx = nodeB.x - nodeA.x
        const dy = nodeB.y - nodeA.y
        const distance = Math.sqrt(dx * dx + dy * dy) + 0.1
        const force = repelForce / (distance * distance)
        
        nodeA.vx -= (dx / distance) * force
        nodeA.vy -= (dy / distance) * force
        nodeB.vx += (dx / distance) * force
        nodeB.vy += (dy / distance) * force
      }
    }

    // Link force
    this.edges.forEach(edge => {
      const source = this.nodes.find(n => n.id === edge.source)
      const target = this.nodes.find(n => n.id === edge.target)
      
      if (source && target) {
        const dx = target.x - source.x
        const dy = target.y - source.y
        const distance = Math.sqrt(dx * dx + dy * dy) + 0.1
        const targetDistance = 100 * edge.weight
        const force = (distance - targetDistance) * linkForce
        
        source.vx += (dx / distance) * force
        source.vy += (dy / distance) * force
        target.vx -= (dx / distance) * force
        target.vy -= (dy / distance) * force
      }
    })

    // Apply forces and constraints
    this.nodes.forEach(node => {
      node.vx *= 0.9 // Damping
      node.vy *= 0.9
      
      node.x += node.vx * alpha
      node.y += node.vy * alpha
      
      // Keep nodes within bounds
      node.x = Math.max(20, Math.min(this.width - 20, node.x))
      node.y = Math.max(20, Math.min(this.height - 20, node.y))
    })
  }
}

export function DuplicateNetworkChart() {
  const [data, setData] = useState<NetworkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simulationRef = useRef<ForceSimulation | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:8000/analytics/duplicate-network')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result: NetworkData = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching duplicate network data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (!data || !data.nodes.length || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Initialize simulation
    simulationRef.current = new ForceSimulation(data.nodes, data.edges, width, height)

    // Animation loop
    const animate = () => {
      if (!simulationRef.current || !ctx) return

      simulationRef.current.tick()

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Draw edges
      data.edges.forEach(edge => {
        const source = simulationRef.current!.nodes.find(n => n.id === edge.source)
        const target = simulationRef.current!.nodes.find(n => n.id === edge.target)
        
        if (source && target) {
          ctx.beginPath()
          ctx.moveTo(source.x, source.y)
          ctx.lineTo(target.x, target.y)
          
          // Color and width based on similarity level
          switch (edge.similarity_level) {
            case 'high':
              ctx.strokeStyle = '#ef4444'
              ctx.lineWidth = 3
              break
            case 'medium':
              ctx.strokeStyle = '#f59e0b'
              ctx.lineWidth = 2
              break
            case 'low':
              ctx.strokeStyle = '#9ca3af'
              ctx.lineWidth = 1
              break
          }
          
          ctx.globalAlpha = 0.7
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      })

      // Draw nodes
      const clusterColors = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
        '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
      ]

      simulationRef.current.nodes.forEach(node => {
        ctx.beginPath()
        ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI)
        
        // Color by cluster
        const clusterIndex = data.clusters.findIndex(c => c.id === node.cluster_id)
        ctx.fillStyle = clusterIndex >= 0 ? clusterColors[clusterIndex % clusterColors.length] : '#9ca3af'
        
        // Highlight selected node
        if (selectedNode && selectedNode.id === node.id) {
          ctx.fillStyle = '#ffffff'
          ctx.strokeStyle = '#000000'
          ctx.lineWidth = 3
          ctx.stroke()
        }
        
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [data, selectedNode])

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!simulationRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Find clicked node
    const clickedNode = simulationRef.current.nodes.find(node => {
      const dx = node.x - x
      const dy = node.y - y
      return Math.sqrt(dx * dx + dy * dy) <= 8
    })

    setSelectedNode(clickedNode || null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-muted-foreground">Loading duplicate network data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading data</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!data || !data.nodes.length) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <p className="text-muted-foreground">No duplicate clusters found to visualize</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Network Visualization */}
        <div className="flex-1">
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="border rounded-lg cursor-pointer bg-background"
            onClick={handleCanvasClick}
          />
          
          {/* Legend */}
          <div className="mt-2 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-red-500"></div>
              <span>High similarity (&gt;0.85)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-amber-500"></div>
              <span>Medium similarity (0.7-0.85)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-gray-400"></div>
              <span>Low similarity (&lt;0.7)</span>
            </div>
          </div>
        </div>

        {/* Node Details Panel */}
        {selectedNode && (
          <div className="lg:w-80 p-4 border rounded-lg bg-card">
            <h4 className="font-semibold mb-3 flex items-center">
              <Info className="w-4 h-4 mr-2" />
              Provider Details
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <span className="ml-2 font-medium">{selectedNode.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Specialty:</span>
                <span className="ml-2">{selectedNode.specialty}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Location:</span>
                <span className="ml-2">{selectedNode.city}, {selectedNode.state}</span>
              </div>
              <div>
                <span className="text-muted-foreground">NPI:</span>
                <span className="ml-2">{selectedNode.npi}</span>
              </div>
              {selectedNode.cluster_id && (
                <div>
                  <span className="text-muted-foreground">Cluster:</span>
                  <span className="ml-2">{selectedNode.cluster_id}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Network Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <div className="text-2xl font-bold">{data.statistics.total_nodes}</div>
          <div className="text-xs text-muted-foreground">Total Providers</div>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <div className="text-2xl font-bold">{data.statistics.total_edges}</div>
          <div className="text-xs text-muted-foreground">Connections</div>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <div className="text-2xl font-bold">{data.statistics.total_clusters}</div>
          <div className="text-xs text-muted-foreground">Clusters</div>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <div className="text-2xl font-bold">{data.statistics.largest_cluster}</div>
          <div className="text-xs text-muted-foreground">Largest Cluster</div>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <div className="text-2xl font-bold">{data.statistics.average_similarity}</div>
          <div className="text-xs text-muted-foreground">Avg Similarity</div>
        </div>
      </div>

      {/* Top Clusters Table */}
      <div className="mt-4">
        <h4 className="font-semibold mb-2">Top 10 Largest Clusters</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Cluster ID</th>
                <th className="text-right py-2">Size</th>
                <th className="text-left py-2">Representative</th>
                <th className="text-left py-2">Members</th>
              </tr>
            </thead>
            <tbody>
              {data.clusters.slice(0, 10).map((cluster) => {
                const representative = data.nodes.find(n => n.id === cluster.representative)
                return (
                  <tr key={cluster.id} className="border-b">
                    <td className="py-2">{cluster.id}</td>
                    <td className="text-right py-2">{cluster.size}</td>
                    <td className="py-2">
                      {representative ? representative.name : 'Unknown'}
                    </td>
                    <td className="py-2">
                      <span className="text-muted-foreground">
                        {cluster.members.slice(0, 3).join(', ')}
                        {cluster.members.length > 3 && ` +${cluster.members.length - 3} more`}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mt-4">
        <p>• Click on nodes to see provider details</p>
        <p>• Each color represents a different duplicate cluster</p>
        <p>• Line thickness and color indicate similarity strength</p>
      </div>
    </div>
  )
}
