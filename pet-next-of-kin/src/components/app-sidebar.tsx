"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PawPrint, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/pet", label: "Pet profile" },
  { href: "/contacts", label: "Emergency contacts" },
  { href: "/care-plan", label: "Care plan" },
  { href: "/check-in", label: "Check-in & escalation" },
  { href: "/alerts", label: "Alert log" },
  { href: "/print/wallet", label: "Wallet card" },
  { href: "/print/door-qr", label: "Door QR" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="print:hidden hidden w-60 shrink-0 border-r border-border/80 bg-card/40 md:flex md:flex-col">
      <div className="flex items-center gap-2 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PawPrint className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <div className="font-serif text-sm font-semibold leading-tight">
            Pet Next of Kin
          </div>
          <div className="text-xs text-muted-foreground">Prototype</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3 pb-6">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border/80 px-4 py-4">
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            This is a demo. No messages are sent. Carry printed materials for
            real emergencies.
          </p>
        </div>
      </div>
    </aside>
  );
}
