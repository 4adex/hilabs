"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Users, AlertTriangle } from "lucide-react"

const duplicates = [
  {
    id: 1,
    provider1: { id: "PR_00015", name: "Jennifer Lopez, MD PhD" },
    provider2: { id: "PR_00516", name: "Jennifer O Lopez, MD PhD" },
    matchScore: 90,
    nameScore: 90.9,
    npiMatch: false,
    addressScore: 100,
    phoneMatch: true,
    licenseScore: 100,
  },
  {
    id: 2,
    provider1: { id: "PR_00018", name: "David Clark, DO PhD" },
    provider2: { id: "PR_00521", name: "Dave Clark, DO PhD" },
    matchScore: 85,
    nameScore: 73.7,
    npiMatch: false,
    addressScore: 100,
    phoneMatch: true,
    licenseScore: 100,
  },
]

export function DuplicateDetectionPanel() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center font-heading">
            <Users className="w-5 h-5 mr-2" />
            Duplicate Detection Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {duplicates.map((duplicate) => (
              <div key={duplicate.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Potential Duplicate
                    </Badge>
                    <span className="text-sm text-muted-foreground">Match Score: {duplicate.matchScore}%</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      Merge
                    </Button>
                    <Button size="sm" variant="outline">
                      Ignore
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Provider 1</h4>
                    <p className="text-sm text-muted-foreground">{duplicate.provider1.id}</p>
                    <p className="font-medium">{duplicate.provider1.name}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Provider 2</h4>
                    <p className="text-sm text-muted-foreground">{duplicate.provider2.id}</p>
                    <p className="font-medium">{duplicate.provider2.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Name Match</p>
                    <Progress value={duplicate.nameScore} className="h-2" />
                    <p className="text-xs mt-1">{duplicate.nameScore}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">NPI Match</p>
                    <Badge variant={duplicate.npiMatch ? "default" : "destructive"} className="text-xs">
                      {duplicate.npiMatch ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Address</p>
                    <Progress value={duplicate.addressScore} className="h-2" />
                    <p className="text-xs mt-1">{duplicate.addressScore}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Phone Match</p>
                    <Badge variant={duplicate.phoneMatch ? "default" : "destructive"} className="text-xs">
                      {duplicate.phoneMatch ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">License</p>
                    <Progress value={duplicate.licenseScore} className="h-2" />
                    <p className="text-xs mt-1">{duplicate.licenseScore}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
