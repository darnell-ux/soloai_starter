import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockCarePlan, mockPet } from "@/lib/mock-data";

const sections: { key: keyof typeof mockCarePlan; label: string }[] = [
  { key: "feeding", label: "Feeding" },
  { key: "medications", label: "Medications" },
  { key: "exercise", label: "Exercise" },
  { key: "litterOrPotty", label: "Litter / potty" },
  { key: "triggers", label: "Triggers" },
  { key: "comfort", label: "Comfort" },
];

export default function CarePlanPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-sm font-medium text-primary">Care plan</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Day-to-day care for {mockPet.name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Written like a note to a trusted friend—not a medical chart. Replace
          with your own language when you ship a real account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Rhythm of a day</CardTitle>
          <CardDescription>
            Tabs keep it scannable on a phone in a hallway.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="feeding">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
              {sections.map((s) => (
                <TabsTrigger key={s.key} value={s.key}>
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {sections.map((s) => (
              <TabsContent key={s.key} value={s.key} className="mt-4">
                <p className="text-sm leading-relaxed text-foreground">
                  {mockCarePlan[s.key]}
                </p>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
