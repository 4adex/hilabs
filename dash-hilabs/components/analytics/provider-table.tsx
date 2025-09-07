"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Edit, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

const providers = [
  {
    id: "PR_00001",
    name: "Rajesh Davis, MD",
    specialty: "Pulmonology",
    state: "CA",
    licenseStatus: "expired",
    dataQuality: 85,
    issues: ["License Expired", "Phone Format"],
  },
  {
    id: "PR_00002",
    name: "Ahmed Ramirez, MD PhD",
    specialty: "Internal Medicine",
    state: "NY",
    licenseStatus: "active",
    dataQuality: 92,
    issues: [],
  },
  {
    id: "PR_00003",
    name: "Jennifer Lopez, MD PhD",
    specialty: "Cardiology",
    state: "TX",
    licenseStatus: "expiring",
    dataQuality: 78,
    issues: ["Address Incomplete", "NPI Mismatch"],
  },
]

export function ProviderTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Provider Directory</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead>State</TableHead>
              <TableHead>License Status</TableHead>
              <TableHead>Data Quality</TableHead>
              <TableHead>Issues</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider) => (
              <TableRow key={provider.id}>
                <TableCell className="font-mono text-sm">{provider.id}</TableCell>
                <TableCell className="font-medium">{provider.name}</TableCell>
                <TableCell>{provider.specialty}</TableCell>
                <TableCell>{provider.state}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      provider.licenseStatus === "active"
                        ? "default"
                        : provider.licenseStatus === "expired"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {provider.licenseStatus === "active" && <CheckCircle className="w-3 h-3 mr-1" />}
                    {provider.licenseStatus === "expired" && <XCircle className="w-3 h-3 mr-1" />}
                    {provider.licenseStatus === "expiring" && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {provider.licenseStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full mr-2 ${
                        provider.dataQuality >= 90
                          ? "bg-primary"
                          : provider.dataQuality >= 80
                            ? "bg-accent"
                            : "bg-destructive"
                      }`}
                    />
                    {provider.dataQuality}%
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {provider.issues.map((issue, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {issue}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
