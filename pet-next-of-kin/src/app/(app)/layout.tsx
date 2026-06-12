import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="print:hidden relative sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/80 bg-background/80 px-4 py-3 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <MobileNav />
            <span className="font-serif text-sm font-semibold">
              Pet Next of Kin
            </span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Marketing</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/onboarding">Onboarding</Link>
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
