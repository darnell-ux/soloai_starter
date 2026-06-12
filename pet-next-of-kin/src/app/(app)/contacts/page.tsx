import Link from "next/link";
import { KeyRound, Phone } from "lucide-react";
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
import { mockContacts } from "@/lib/mock-data";

export default function ContactsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-sm font-medium text-primary">Emergency contacts</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          People who can step in—on your terms
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Order matters. The prototype shows how a primary contact might receive
          the first message, then backups. Phone numbers are mock; nothing is
          dialed or texted from this build.
        </p>
      </div>

      <div className="space-y-4">
        {mockContacts.map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="font-serif text-xl">{c.name}</CardTitle>
                  <Badge variant="outline">Priority {c.priority}</Badge>
                  {c.hasKey ? (
                    <Badge variant="calm" className="gap-1">
                      <KeyRound className="h-3 w-3" />
                      Has key
                    </Badge>
                  ) : null}
                </div>
                <CardDescription>{c.relation}</CardDescription>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/alerts">Notify log</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="font-mono text-foreground">{c.phone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email · </span>
                  <span>{c.email}</span>
                </div>
              </div>
              {c.notes ? (
                <>
                  <Separator />
                  <p className="leading-relaxed text-muted-foreground">
                    {c.notes}
                  </p>
                </>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
