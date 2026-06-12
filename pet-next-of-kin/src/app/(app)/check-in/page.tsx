"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCheckInState, useAlertLog } from "@/lib/client-store";
import { mockEscalationSteps, mockContacts, mockPet } from "@/lib/mock-data";

export default function CheckInPage() {
  const { state, update } = useCheckInState();
  const { push } = useAlertLog();
  const [simulateStage, setSimulateStage] = useState(0);
  const [hoursSince, setHoursSince] = useState(0);

  useEffect(() => {
    const tick = () => {
      const ms = Date.now() - new Date(state.lastCheckInIso).getTime();
      setHoursSince(Math.max(0, ms / (1000 * 60 * 60)));
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [state.lastCheckInIso]);

  const overdue = hoursSince > state.intervalHours;

  const markOkay = () => {
    update({ lastCheckInIso: new Date().toISOString() });
    setSimulateStage(0);
    push({
      channel: "in_app",
      title: "Check-in received",
      body: "You tapped “I’m okay.” Your window has reset gently.",
    });
    toast.success("Check-in saved locally", {
      description: "Prototype only—no messages were sent.",
    });
  };

  const simulateMissed = () => {
    const next = Math.min(simulateStage + 1, mockEscalationSteps.length);
    setSimulateStage(next);
    if (next === 2) {
      push({
        channel: "contact",
        title: "Backup contact draft queued",
        body: `Would notify ${mockContacts[0].name}, then ${mockContacts[1].name} with your pre-approved wording.`,
      });
    }
    if (next >= 3) {
      push({
        channel: "system",
        title: "Veterinary context attached",
        body: "Escalation path includes vet card and feeding notes for responders.",
      });
    }
    toast.message("Escalation stage advanced (demo)", {
      description: "Open the alert log to see the paper trail.",
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-sm font-medium text-primary">Check-in & escalation</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Gentle rhythm, clear handoffs
        </h1>
        <p className="mt-2 text-muted-foreground">
          You choose the interval. If life gets loud and you miss a window, we
          walk a path you’ve already agreed to—never a surprise ambush.
        </p>
      </div>

      <Alert variant="gentle">
        <AlertTitle>Prototype safety rail</AlertTitle>
        <AlertDescription>
          Buttons below only change data in this browser. No SMS, email, or
          push leaves your machine.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="font-serif text-xl">Today’s window</CardTitle>
            <CardDescription>
              Last acknowledgment{" "}
              <span className="font-medium text-foreground">
                {new Date(state.lastCheckInIso).toLocaleString()}
              </span>
            </CardDescription>
          </div>
          <Badge variant={overdue ? "care" : "calm"}>
            {overdue ? "Outside soft window" : "Inside soft window"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 rounded-lg border border-border/80 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Interval (demo)</p>
              <p className="text-lg font-medium">{state.intervalHours} hours</p>
              <p className="mt-1 text-xs text-muted-foreground">
                About {hoursSince.toFixed(1)} hours since last check-in (local
                clock).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="armed"
                checked={state.intervalHours <= 36}
                onCheckedChange={(v) =>
                  update({ intervalHours: v ? 36 : 48 })
                }
              />
              <Label htmlFor="armed" className="text-sm text-muted-foreground">
                Shorter window (more frequent nudges)
              </Label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={markOkay} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              I’m okay — reset window
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Preview contact message</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Message your contacts would see</DialogTitle>
                  <DialogDescription>
                    Plain language, focused on {mockPet.name}—not medical
                    advice about you.
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                  <p>
                    Hi, this is an automated note from {mockPet.name}’s Pet Next
                    of Kin plan. We haven’t received Sam’s gentle check-in. If you
                    can, please visit the home at the address on file and make
                    sure {mockPet.name} has food, water, and a quiet room. Reply
                    STOP to silence this path.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            <CardTitle className="font-serif text-xl">
              Missed check-in escalation
            </CardTitle>
          </div>
          <CardDescription>
            Stages light up as you tap “Simulate missed check-in” to rehearse the
            experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-4">
            {mockEscalationSteps.map((step, idx) => {
              const active = simulateStage > idx;
              return (
                <li key={step.id} className="flex gap-3">
                  <div
                    className={
                      active
                        ? "mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
                        : "mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/30"
                    }
                  />
                  <div>
                    <p className="font-medium">{step.label}</p>
                    <p className="text-sm text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Stage {Math.min(simulateStage, mockEscalationSteps.length)} /{" "}
              {mockEscalationSteps.length}
            </p>
            <Button variant="secondary" onClick={simulateMissed}>
              Simulate missed check-in
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="font-serif text-lg">If you need a pause</CardTitle>
          </div>
          <CardDescription>
            Travel, hospital stays, or grief are all valid reasons to hush
            alerts. A shipped product would let you snooze with one clear
            confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() =>
              toast.message("Snooze isn’t wired in the prototype", {
                description: "Imagine a calm date-picker appearing here.",
              })
            }
          >
            Snooze check-ins (placeholder)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
