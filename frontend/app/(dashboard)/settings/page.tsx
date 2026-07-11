"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { fetchOrganization } from "@/lib/api/organizations";
import type { OrganizationBranding } from "@/lib/types/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Building2, Palette, User, Upload, Monitor } from "lucide-react";
import { useTheme } from "@teispace/next-themes";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");
  const [companySlogan, setCompanySlogan] = useState("");
  const [branding, setBranding] = useState<OrganizationBranding>({});
  const [displayName, setDisplayName] = useState(user?.name ?? "");

  useEffect(() => {
    if (!user) return;

    setDisplayName(user.name);

    fetchOrganization()
      .then((bundle) => {
        if (!bundle) {
          setLoadError("No organization found for this account.");
          return;
        }
        setOrgName(bundle.organization.name);
        setSlug(bundle.organization.slug);
        setIndustry(bundle.profile?.industry ?? "");
        setWebsite(bundle.profile?.website ?? "");
        setPhone(bundle.profile?.phone ?? "");
        setAddress(bundle.profile?.address ?? "");
        setCity(bundle.profile?.city ?? "");
        setState(bundle.profile?.state ?? "");
        setZip(bundle.profile?.zip ?? "");
        setCountry(bundle.profile?.country ?? "");
        setCompanySlogan(bundle.settings?.companySlogan ?? "");
        setBranding(bundle.settings?.branding ?? {});
        setLogoUrl(bundle.profile?.logo ?? "/logo.png");
        setLoadError(null);
      })
      .catch((error) => {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load organization settings",
        );
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  const handleSaveOrg = () => {
    toast.success("Organization profile saved (demo)");
  };

  const handleSaveBranding = () => {
    toast.success("Branding settings saved (demo)");
  };

  const handleSaveProfile = () => {
    toast.success("Profile saved (demo)");
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization profile, branding, and account.
        </p>
        {loadError && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
            {loadError}. Create an organization via Better Auth if you are a new user.
          </p>
        )}
      </div>

      <Tabs defaultValue="org" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-2xl mb-8 h-auto gap-1">
          <TabsTrigger value="org" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="user" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="org">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>
                Core organization record — maps to{" "}
                <code className="text-xs">organization</code> and{" "}
                <code className="text-xs">organization_profile</code> tables.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="orgName">Organization name</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" value={slug} disabled />
                  <p className="text-xs text-muted-foreground">
                    Unique URL identifier (read-only).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="HVAC Maintenance"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State / Province</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP / Postal code</Label>
                  <Input
                    id="zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleSaveOrg}>Save organization</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Maps to <code className="text-xs">organization_settings</code>{" "}
                — logo, slogan, and branding JSON.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <Label>Company logo</Label>
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                    <Image
                      src={logoUrl}
                      alt="Organization logo"
                      width={80}
                      height={80}
                      className="object-contain p-2"
                    />
                  </div>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload logo
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companySlogan">Company slogan</Label>
                <Input
                  id="companySlogan"
                  value={companySlogan}
                  onChange={(e) => setCompanySlogan(e.target.value)}
                  placeholder="Your company tagline"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary brand color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={branding.primaryColor ?? "#0f766e"}
                      onChange={(e) =>
                        setBranding((b) => ({
                          ...b,
                          primaryColor: e.target.value,
                        }))
                      }
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">
                      {branding.primaryColor ?? "#0f766e"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="accentColor"
                      type="color"
                      value={branding.accentColor ?? "#14b8a6"}
                      onChange={(e) =>
                        setBranding((b) => ({
                          ...b,
                          accentColor: e.target.value,
                        }))
                      }
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">
                      {branding.accentColor ?? "#14b8a6"}
                    </span>
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveBranding}>Save branding</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the application theme.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                >
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                >
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  onClick={() => setTheme("system")}
                >
                  System
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user">
          <Card>
            <CardHeader>
              <CardTitle>User profile</CardTitle>
              <CardDescription>
                Your personal account — linked to Better Auth user record.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" value={user.email} disabled />
                <p className="text-xs text-muted-foreground">
                  Email is managed through your authentication provider.
                </p>
              </div>
              <Button onClick={handleSaveProfile}>Save profile</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
