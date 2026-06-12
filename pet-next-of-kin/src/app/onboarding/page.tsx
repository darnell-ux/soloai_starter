"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOnboardingState } from "@/lib/client-store";

const steps = ["Welcome", "About you", "Your pet", "Promise"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { state, update } = useOnboardingState();
  const [step, setStep] = useState(0);

  const progress = ((step + 1) / steps.length) * 100;

  const next = () => {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else {
      update({
        completed: true,
        acknowledgedAt: new Date().toISOString(),
      });
      router.push("/dashboard");
    }
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const canContinue = () => {
    if (step === 1) return state.ownerName.trim().length > 1;
    if (step === 2)
      return state.petName.trim().length > 0 && state.petSpecies.length > 0;
    return true;
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10 md:py-16">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </Button>
        <span className="text-xs font-medium text-muted-foreground">
          Step {step + 1} of {steps.length}
        </span>
      </div>

      <div className="mb-6">
        <Progress value={progress} />
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {steps[step]}
        </p>
      </div>

      <Card className="border-border/80 shadow-md">
        <CardHeader>
          {step === 0 && (
            <>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <CardTitle className="font-serif text-2xl">
                Let’s make a soft landing for your pet
              </CardTitle>
              <CardDescription className="text-base leading-relaxed">
                In a few minutes you’ll have a clear profile, contacts, and
                printable helpers. Nothing here is sent for real—this is a calm
                rehearsal you can share with people you trust.
              </CardDescription>
            </>
          )}
          {step === 1 && (
            <>
              <CardTitle className="font-serif text-2xl">About you</CardTitle>
              <CardDescription className="text-base">
                How should caring contacts refer to you on printed materials?
              </CardDescription>
            </>
          )}
          {step === 2 && (
            <>
              <CardTitle className="font-serif text-2xl">Your pet</CardTitle>
              <CardDescription className="text-base">
                We’ll pair this with the sample care plan in the prototype. You
                can refine details anytime.
              </CardDescription>
            </>
          )}
          {step === 3 && (
            <>
              <CardTitle className="font-serif text-2xl">
                A promise, plainly spoken
              </CardTitle>
              <CardDescription className="text-base">
                Pet Next of Kin is not a substitute for emergency services. It is
                a bridge so your pet is seen quickly by people who care.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="space-y-2">
              <Label htmlFor="owner">Your name</Label>
              <Input
                id="owner"
                placeholder="Sam Shea"
                value={state.ownerName}
                onChange={(e) => update({ ownerName: e.target.value })}
              />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pet">Pet’s name</Label>
                <Input
                  id="pet"
                  placeholder="Milo"
                  value={state.petName}
                  onChange={(e) => update({ petName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="species">Species</Label>
                <Input
                  id="species"
                  placeholder="Cat, dog, rabbit…"
                  value={state.petSpecies}
                  onChange={(e) => update({ petSpecies: e.target.value })}
                />
              </div>
            </div>
          )}
          {step === 3 && (
            <Alert variant="gentle">
              <AlertTitle>You stay in control</AlertTitle>
              <AlertDescription>
                Check-ins are gentle by default. Contacts only see the messages
                you pre-write. You can pause everything when you travel—or when
                you simply need a break.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={back}
            disabled={step === 0}
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={next}
            disabled={!canContinue()}
            className="gap-2"
          >
            {step === steps.length - 1 ? (
              <>
                Finish
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
