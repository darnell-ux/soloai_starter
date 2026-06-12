import Link from "next/link";
import { Heart, PawPrint, QrCode, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const pillars = [
  {
    title: "A plan people can follow",
    body: "Pet profile, vet, feeding, meds, and triggers—written for tired hands and worried minds.",
    icon: PawPrint,
  },
  {
    title: "Trusted humans in order",
    body: "Primary and backup contacts know what to do first: care for your pet, with words you approved.",
    icon: Heart,
  },
  {
    title: "Visible when it matters",
    body: "Wallet card and door QR open a calm public page—no accounts, no noise, just what responders need.",
    icon: QrCode,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 md:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PawPrint className="h-5 w-5" />
          </div>
          <div>
            <p className="font-serif text-base font-semibold">Pet Next of Kin</p>
            <p className="text-xs text-muted-foreground">Continuity prototype</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Open app</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 md:px-8">
        <section className="py-12 md:py-20">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Mock data · no real alerts sent
          </p>
          <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            If something happens to me, my pet will not be left alone.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Pet Next of Kin helps you assemble a humane continuity kit—contacts,
            care instructions, gentle check-ins, and printable touchpoints—so the
            people who love your pet know exactly how to help.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/onboarding">Begin onboarding</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/dashboard">Explore the dashboard</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {pillars.map(({ title, body, icon: Icon }) => (
            <Card key={title} className="border-border/80 bg-card/80 shadow-sm">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {body}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-2">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-5 w-5 text-primary" />
                Wallet & door
              </CardTitle>
              <CardDescription>
                Print a folded wallet card for your bag, and a larger QR for
                your door. Both link to a public page you control.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link href="/print/wallet">Preview wallet card</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/print/door-qr">Preview door QR</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5 text-primary" />
                Missed check-ins
              </CardTitle>
              <CardDescription>
                A staged escalation you define ahead of time—starting with a
                soft nudge, never a panic unless you say so.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary">
                <Link href="/check-in">See how escalation works</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
