"use client";

import Link from "next/link";
import {
  ClipboardList,
  HeartPulse,
  QrCode,
  Users,
  Wallet,
} from "lucide-react";
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
import { useOnboardingState, useCheckInState } from "@/lib/client-store";
import { EMERGENCY_PUBLIC_SLUG, mockPet } from "@/lib/mock-data";
import { getEmergencyPageUrl } from "@/lib/emergency-url";

function formatRelative(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const { state: ob } = useOnboardingState();
  const { state: ci } = useCheckInState();

  const petLabel = ob.petName ? ob.petName : mockPet.name;
  const ownerLabel = ob.ownerName ? ob.ownerName : "your household";

  const nextDue = new Date(
    new Date(ci.lastCheckInIso).getTime() + ci.intervalHours * 60 * 60 * 1000,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <p className="text-sm font-medium text-primary">Today</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
          {ownerLabel}, your continuity kit is here when you need it.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Everything below is mock data for the prototype. Tap any card to
          explore how responders and loved ones would experience Pet Next of
          Kin.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/80 md:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="font-serif text-xl">
                Check-in pulse
              </CardTitle>
              <CardDescription>
                A lightweight rhythm so people know you’re reachable—not to
                police your life.
              </CardDescription>
            </div>
            <Badge variant="calm">Demo</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Last “I’m okay”</p>
              <p className="text-lg font-medium">
                {formatRelative(ci.lastCheckInIso)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Next soft window around{" "}
                <span className="font-medium text-foreground">
                  {nextDue.toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/check-in">Review escalation</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/alerts">Open alert log</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <HeartPulse className="h-5 w-5" />
              <CardTitle className="font-serif text-lg">
                {petLabel}’s profile
              </CardTitle>
            </div>
            <CardDescription>
              Species, behavior cues, and identifiers responders notice first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" asChild className="w-full sm:w-auto">
              <Link href="/pet">Open pet profile</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Users className="h-5 w-5" />
              <CardTitle className="font-serif text-lg">
                People in order
              </CardTitle>
            </div>
            <CardDescription>
              Primary and backups, with notes about keys and comfort.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" asChild className="w-full sm:w-auto">
              <Link href="/contacts">Open contacts</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <ClipboardList className="h-5 w-5" />
              <CardTitle className="font-serif text-lg">Care plan</CardTitle>
            </div>
            <CardDescription>
              Feeding, meds, litter, and what helps {petLabel} feel safe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" asChild className="w-full sm:w-auto">
              <Link href="/care-plan">Open care plan</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Wallet className="h-5 w-5" />
              <CardTitle className="font-serif text-lg">Printables</CardTitle>
            </div>
            <CardDescription>
              Wallet card for your bag; door QR for neighbors and responders.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/print/wallet">Wallet card</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/print/door-qr">Door QR</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <QrCode className="h-6 w-6 text-primary" />
          <div>
            <p className="font-medium">Public emergency page</p>
            <p className="text-sm text-muted-foreground">
              Shareable link for wallet cards and door posters (demo slug:{" "}
              <span className="font-mono text-foreground">
                {EMERGENCY_PUBLIC_SLUG}
              </span>
              ).
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline">
            <Link href={`/e/${EMERGENCY_PUBLIC_SLUG}`} target="_blank">
              Preview public page
            </Link>
          </Button>
          <p className="break-all text-xs text-muted-foreground">
            Demo URL:{" "}
            <span className="font-mono text-foreground">
              {getEmergencyPageUrl(EMERGENCY_PUBLIC_SLUG)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
