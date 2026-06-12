import { notFound } from "next/navigation";
import Link from "next/link";
import { Phone, Stethoscope, HeartHandshake, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  EMERGENCY_PUBLIC_SLUG,
  mockCarePlan,
  mockContacts,
  mockOwner,
  mockPet,
  mockVet,
} from "@/lib/mock-data";

type Props = { params: Promise<{ slug: string }> };

export default async function EmergencyPublicPage({ params }: Props) {
  const { slug } = await params;
  if (slug !== EMERGENCY_PUBLIC_SLUG) {
    notFound();
  }

  const primary = mockContacts[0];
  const backup = mockContacts[1];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/25 px-4 py-10 md:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center">
          <Badge variant="outline" className="mb-3">
            Public continuity page · demo
          </Badge>
          <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            Thank you for helping {mockPet.name}
          </h1>
          <p className="mt-3 text-muted-foreground">
            This page exists so {mockPet.name} is fed, safe, and with people who
            know the routine. The human they love is{" "}
            <span className="font-medium text-foreground">
              {mockOwner.displayName}
            </span>
            .
          </p>
        </header>

        <Alert variant="gentle">
          <AlertTitle>Not an emergency hotline</AlertTitle>
          <AlertDescription>
            If human life is in danger, call your local emergency number first.
            This page is only for pet continuity.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <Home className="h-5 w-5 text-primary" />
              Home
            </CardTitle>
            <CardDescription>Where responders may coordinate care.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{mockOwner.displayName}</p>
            <p className="text-muted-foreground">{mockOwner.homeAddress}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <HeartHandshake className="h-5 w-5 text-primary" />
              Call someone who knows {mockPet.name}
            </CardTitle>
            <CardDescription>
              Start with primary, then backup. Numbers are mock in this
              prototype.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/30 p-4">
              <Phone className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">{primary.name}</p>
                <p className="text-xs text-muted-foreground">{primary.relation}</p>
                <p className="mt-1 font-mono text-sm">{primary.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border/80 p-4">
              <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{backup.name}</p>
                <p className="text-xs text-muted-foreground">{backup.relation}</p>
                <p className="mt-1 font-mono text-sm">{backup.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <Stethoscope className="h-5 w-5 text-primary" />
              Veterinary support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{mockVet.clinic}</p>
            <p className="text-muted-foreground">{mockVet.phone}</p>
            <p className="text-muted-foreground">{mockVet.address}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Immediate care notes</CardTitle>
            <CardDescription>Short, practical, kind.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Feeding
              </p>
              <p className="mt-1">{mockCarePlan.feeding}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Medications
              </p>
              <p className="mt-1">{mockCarePlan.medications}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Comfort & triggers
              </p>
              <p className="mt-1">{mockCarePlan.comfort}</p>
              <p className="mt-2 text-muted-foreground">{mockCarePlan.triggers}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pb-8">
          <Button variant="outline" asChild>
            <Link href="/">Return to Pet Next of Kin</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
