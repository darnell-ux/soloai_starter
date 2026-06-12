"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
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
import { useAlertLog } from "@/lib/client-store";
import type { AlertEntry } from "@/lib/client-store";

const channels: { id: AlertEntry["channel"] | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in_app", label: "In-app" },
  { id: "contact", label: "Contacts" },
  { id: "system", label: "System" },
];

function channelBadge(channel: AlertEntry["channel"]) {
  if (channel === "in_app") return <Badge variant="calm">In-app</Badge>;
  if (channel === "contact") return <Badge variant="care">Contacts</Badge>;
  return <Badge variant="secondary">System</Badge>;
}

export default function AlertsPage() {
  const { entries } = useAlertLog();
  const [filter, setFilter] = useState<(typeof channels)[number]["id"]>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((e) => e.channel === filter);
  }, [entries, filter]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-sm font-medium text-primary">Alert log</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          A readable trail—not an alarm panel
        </h1>
        <p className="mt-2 text-muted-foreground">
          Every nudge your future self might want to audit, in one calm list.
          Data stays in this browser for the prototype.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <Filter className="h-5 w-5 text-primary" />
              Filters
            </CardTitle>
            <CardDescription>
              Narrow the story without hiding what mattered.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {channels.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={filter === c.id ? "default" : "outline"}
                onClick={() => setFilter(c.id)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-0">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nothing in this filter yet.
            </p>
          ) : (
            <ul>
              {filtered.map((e, i) => (
                <li key={e.id}>
                  {i > 0 ? <Separator className="my-4" /> : null}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{e.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {e.body}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      {channelBadge(e.channel)}
                      <time className="text-xs text-muted-foreground">
                        {new Date(e.atIso).toLocaleString()}
                      </time>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
