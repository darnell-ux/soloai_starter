"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useOnboardingState } from "@/lib/client-store";
import { mockPet, mockVet } from "@/lib/mock-data";

export default function PetProfilePage() {
  const { state } = useOnboardingState();
  const name = state.petName ? state.petName : mockPet.name;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Pet profile</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            {name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            What someone kind needs to know in the first five minutes.
          </p>
        </div>
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-4xl shadow-inner">
          {mockPet.photoEmoji}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Basics</CardTitle>
          <CardDescription>Clinic-ready details, kept human-readable.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Species & breed
            </p>
            <p className="mt-1 text-sm">
              {mockPet.species} · {mockPet.breed}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Age & weight
            </p>
            <p className="mt-1 text-sm">
              {mockPet.age} · {mockPet.weight}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Microchip
            </p>
            <p className="mt-1 font-mono text-sm">{mockPet.microchip}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Inside the home</CardTitle>
          <CardDescription>
            Helps strangers move slowly and predictably.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>{mockPet.temperament}</p>
          <Separator />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Allergies & sensitivities
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {mockPet.allergies.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="font-serif text-xl">Veterinary home</CardTitle>
            <CardDescription>Primary clinic on file for this prototype.</CardDescription>
          </div>
          <Badge variant="secondary">Verified (mock)</Badge>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium">{mockVet.clinic}</p>
          <p className="text-muted-foreground">{mockVet.phone}</p>
          <p className="text-muted-foreground">{mockVet.address}</p>
          <p className="pt-2 text-muted-foreground">{mockVet.hours}</p>
        </CardContent>
      </Card>
    </div>
  );
}
