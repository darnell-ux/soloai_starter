"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/pet", label: "Pet profile" },
  { href: "/contacts", label: "Contacts" },
  { href: "/care-plan", label: "Care plan" },
  { href: "/check-in", label: "Check-in" },
  { href: "/alerts", label: "Alert log" },
  { href: "/print/wallet", label: "Wallet card" },
  { href: "/print/door-qr", label: "Door QR" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="print:hidden md:hidden">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-expanded={open}
        aria-label="Open menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      {open ? (
        <div className="absolute left-3 right-3 top-16 z-40 rounded-xl border border-border bg-card p-2 shadow-lg">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium",
                  pathname === l.href
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
