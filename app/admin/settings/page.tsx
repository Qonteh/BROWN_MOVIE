"use client"

import { useEffect, useState } from "react"
import { Save, Globe, CreditCard, Mail, Bell, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type SettingsState = {
  siteName: string
  siteTagline: string
  contactEmail: string
  contactPhone: string
  defaultCurrency: string
  mpesaEnabled: boolean
  airtelEnabled: boolean
  halopesaEnabled: boolean
  mixxEnabled: boolean
  cardEnabled: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  maintenanceMode: boolean
}

const defaultSettings: SettingsState = {
  siteName: "Brown Movies",
  siteTagline: "Premium Entertainment",
  contactEmail: "support@brownmovies.com",
  contactPhone: "+255 700 000 000",
  defaultCurrency: "TSH",
  mpesaEnabled: true,
  airtelEnabled: true,
  halopesaEnabled: true,
  mixxEnabled: true,
  cardEnabled: true,
  emailNotifications: true,
  pushNotifications: false,
  maintenanceMode: false,
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const loadSettings = async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success || !data.settings) {
        throw new Error(data.error || "Failed to load settings")
      }

      setSettings({
        ...defaultSettings,
        ...data.settings,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async () => {
    setError("")
    setSuccess("")
    setIsSaving(true)

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save settings")
      }

      setSuccess("Settings saved successfully")
      setSettings({
        ...defaultSettings,
        ...data.settings,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (key: keyof SettingsState, value: string | boolean) => {
    setSuccess("")
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your platform settings</p>
        </div>
        <Button 
          className="btn-gradient text-white"
          onClick={handleSave}
          disabled={isSaving || isLoading}
        >
          <span
            aria-hidden="true"
            className={`mr-2 inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white align-middle ${isSaving ? "animate-spin opacity-100" : "opacity-0"}`}
          />
          <Save
            className={`mr-2 h-4 w-4 ${isSaving ? "hidden" : "inline-block"}`}
            aria-hidden={isSaving}
          />
          <span>{isSaving ? "Saving..." : "Save Changes"}</span>
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {success ? (
        <Card className="border-green-600/40 bg-green-600/10">
          <CardContent className="pt-6 text-sm text-green-300">{success}</CardContent>
        </Card>
      ) : null}

      {/* General Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            General Settings
          </CardTitle>
          <CardDescription>Basic platform configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <input
                id="siteName"
                type="text"
                value={settings.siteName}
                onChange={(e) => handleChange("siteName", e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteTagline">Tagline</Label>
              <input
                id="siteTagline"
                type="text"
                value={settings.siteTagline}
                onChange={(e) => handleChange("siteTagline", e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <input
                id="contactEmail"
                type="email"
                value={settings.contactEmail}
                onChange={(e) => handleChange("contactEmail", e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <input
                id="contactPhone"
                type="text"
                value={settings.contactPhone}
                onChange={(e) => handleChange("contactPhone", e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Payment Methods
          </CardTitle>
          <CardDescription>Enable or disable payment options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 bg-red-500 rounded flex items-center justify-center text-white font-bold text-xs">
                M-Pesa
              </div>
              <div>
                <p className="font-medium text-foreground">M-Pesa</p>
                <p className="text-sm text-muted-foreground">Vodacom mobile money</p>
              </div>
            </div>
            <Switch
              checked={settings.mpesaEnabled}
              onCheckedChange={(checked) => handleChange("mpesaEnabled", checked)}
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold text-xs">
                Airtel
              </div>
              <div>
                <p className="font-medium text-foreground">Airtel Money</p>
                <p className="text-sm text-muted-foreground">Airtel mobile money</p>
              </div>
            </div>
            <Switch
              checked={settings.airtelEnabled}
              onCheckedChange={(checked) => handleChange("airtelEnabled", checked)}
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 bg-orange-500 rounded flex items-center justify-center text-white font-bold text-xs">
                Halo
              </div>
              <div>
                <p className="font-medium text-foreground">HaloPesa</p>
                <p className="text-sm text-muted-foreground">Halotel mobile money</p>
              </div>
            </div>
            <Switch
              checked={settings.halopesaEnabled}
              onCheckedChange={(checked) => handleChange("halopesaEnabled", checked)}
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold text-xs">
                MiXX
              </div>
              <div>
                <p className="font-medium text-foreground">MiXX by Yas</p>
                <p className="text-sm text-muted-foreground">TTCL mobile money</p>
              </div>
            </div>
            <Switch
              checked={settings.mixxEnabled}
              onCheckedChange={(checked) => handleChange("mixxEnabled", checked)}
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">
                VISA
              </div>
              <div>
                <p className="font-medium text-foreground">Card Payments</p>
                <p className="text-sm text-muted-foreground">Visa, Mastercard</p>
              </div>
            </div>
            <Switch
              checked={settings.cardEnabled}
              onCheckedChange={(checked) => handleChange("cardEnabled", checked)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>Configure notification settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive purchase confirmations via email</p>
              </div>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => handleChange("emailNotifications", checked)}
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Browser push notifications</p>
              </div>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(checked) => handleChange("pushNotifications", checked)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Maintenance */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Maintenance
          </CardTitle>
          <CardDescription>Site maintenance options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <div>
              <p className="font-medium text-foreground">Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">Temporarily disable public access to the site</p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => handleChange("maintenanceMode", checked)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
