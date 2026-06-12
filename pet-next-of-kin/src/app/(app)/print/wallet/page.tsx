"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EMERGENCY_PUBLIC_SLUG, mockOwner, mockPet } from "@/lib/mock-data";
import { useEmergencyQrUrl } from "@/lib/use-emergency-qr-url";

export default function WalletPrintPage() {
  const url = useEmergencyQrUrl();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="print:hidden">
        <p className="text-sm font-medium text-primary">Printable</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Wallet card
        </h1>
        <p className="mt-2 text-muted-foreground">
          Fold-friendly layout with a scannable QR. Print from your browser’s
          print dialog—no account required in this prototype.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            className="gap-2"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/e/${EMERGENCY_PUBLIC_SLUG}`} target="_blank">
              Preview linked page
            </Link>
          </Button>
        </div>
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardHeader className="print:hidden">
          <CardTitle className="font-serif text-lg">3.5″ × 2″ style preview</CardTitle>
          <CardDescription>
            For demo purposes, content is centered on letter paper when you
            print.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto flex min-h-[360px] max-w-md flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm print:min-h-0 print:max-w-none print:border print:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Pet Next of Kin
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold">
                If I cannot respond
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Please help{" "}
                <span className="font-medium text-foreground">{mockPet.name}</span>{" "}
                first. Scan for feeding, vet, and trusted contacts.
              </p>
            </div>
            <div className="mt-6 flex items-end justify-between gap-4">
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{mockOwner.displayName}</p>
                <p>{mockOwner.homeAddress}</p>
              </div>
              <div className="rounded-lg bg-white p-1.5 shadow-inner">
                {url ? (
                  <QRCodeSVG value={url} size={88} level="M" includeMargin={false} />
                ) : (
                  <div className="h-[88px] w-[88px] animate-pulse rounded bg-muted" />
                )}
              </div>
            </div>
            <p className="mt-4 text-[11px] leading-snug text-muted-foreground">
              Not a substitute for 911. For pet continuity only.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
