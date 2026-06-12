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
import { EMERGENCY_PUBLIC_SLUG, mockPet } from "@/lib/mock-data";
import { useEmergencyQrUrl } from "@/lib/use-emergency-qr-url";

export default function DoorQrPrintPage() {
  const url = useEmergencyQrUrl();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="print:hidden">
        <p className="text-sm font-medium text-primary">Printable</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Door QR poster
        </h1>
        <p className="mt-2 text-muted-foreground">
          Large QR for an entryway or kennel. Keep language steady so neighbors
          know what they’re scanning.
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
          <CardTitle className="font-serif text-lg">Letter / A4 friendly</CardTitle>
          <CardDescription>
            High-contrast block designed to read from a hallway.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto flex max-w-xl flex-col items-center gap-6 rounded-3xl border-2 border-primary/30 bg-gradient-to-b from-card to-secondary/40 px-8 py-10 text-center shadow-sm print:max-w-none print:border-primary print:py-14">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Pet continuity
            </p>
            <h2 className="font-serif text-3xl font-semibold md:text-4xl">
              Please scan if I cannot respond
            </h2>
            <p className="max-w-md text-sm text-muted-foreground md:text-base">
              This QR opens care instructions for{" "}
              <span className="font-medium text-foreground">{mockPet.name}</span>.
              It does not unlock my home or share unrelated medical data.
            </p>
            <div className="rounded-3xl bg-white p-4 shadow-md print:p-6">
              {url ? (
                <QRCodeSVG value={url} size={220} level="H" includeMargin />
              ) : (
                <div className="h-[220px] w-[220px] animate-pulse rounded-xl bg-muted" />
              )}
            </div>
            <p className="max-w-sm text-xs text-muted-foreground">
              Demo slug:{" "}
              <span className="font-mono text-foreground">
                /e/{EMERGENCY_PUBLIC_SLUG}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
