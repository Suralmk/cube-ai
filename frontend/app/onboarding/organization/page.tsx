"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createOrganization } from "@/lib/api/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateOrganizationPage() {
  const { refreshUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await createOrganization({
        name: name.trim(),
        slug: slug.trim() || undefined,
        industry: industry.trim() || undefined,
      });
      await refreshUser();
      router.push("/chat");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create organization",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <Card className="w-full max-w-lg border-zinc-200 dark:border-zinc-800 shadow-lg">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="flex justify-center">
            <div className="relative h-12 w-36">
              <Image
                src="/logo.png"
                alt="Cube AI Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Create your organization
            </CardTitle>
            <CardDescription className="text-zinc-500 mt-2">
              Set up your company workspace before accessing the dashboard.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization name</Label>
              <Input
                id="orgName"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acme HVAC Services"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgSlug">URL slug</Label>
              <Input
                id="orgSlug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="acme-hvac"
                required
              />
              <p className="text-xs text-muted-foreground">
                Used as a unique identifier for your organization.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry (optional)</Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="HVAC Maintenance"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Continue to dashboard"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
