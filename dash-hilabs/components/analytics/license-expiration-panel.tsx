"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, AlertTriangle, Clock } from "lucide-react"

const expiringLicenses = [
  {
    providerId: "PR_00001",
    name: "Rajesh Davis, MD",
    specialty: "Pulmonology",
    state: "CA",
    licenseNumber: "A21395",
    expirationDate: "2025-05-14",
    daysUntilExpiration: -180,
    status: "expired",
  },
  {
    providerId: "PR_00045",
    name: "Sarah Johnson, MD",
    specialty: "Cardiology",
    state: "NY",
    licenseNumber: "NY789456",
    expirationDate: "2025-03-15",
    daysUntilExpiration: 45,
    status: "expiring",
  },
  {
    providerId: "PR_00078",
    name: "Michael Chen, DO",
    specialty: "Internal Medicine",
    state: "TX",
    licenseNumber: "TX123789",
    expirationDate: "2025-02-28",
    daysUntilExpiration: 30,
    status: "expiring",
  },
]

export function LicenseExpirationPanel() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center font-heading">
            <Calendar className="w-5 h-5 mr-2" />
            License Expiration Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expiringLicenses.map((license) => (
              <div key={license.providerId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Badge variant={license.status === "expired" ? "destructive" : "secondary"}>
                      {license.status === "expired" ? (
                        <AlertTriangle className="w-3 h-3 mr-1" />
                      ) : (
                        <Clock className="w-3 h-3 mr-1" />
                      )}
                      {license.status === "expired" ? "Expired" : "Expiring Soon"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {license.status === "expired"
                        ? `Expired ${Math.abs(license.daysUntilExpiration)} days ago`
                        : `${license.daysUntilExpiration} days remaining`}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      Contact Provider
                    </Button>
                    <Button size="sm">Send Renewal Notice</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Provider</p>
                    <p className="font-medium">{license.name}</p>
                    <p className="text-xs text-muted-foreground">{license.providerId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Specialty</p>
                    <p className="font-medium">{license.specialty}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">License</p>
                    <p className="font-medium">
                      {license.state} - {license.licenseNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expiration Date</p>
                    <p className="font-medium">{license.expirationDate}</p>
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
