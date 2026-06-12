import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EmergencyNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="text-sm font-medium text-primary">Public page</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold">
        This continuity link is not available
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The QR or wallet card may be out of date, or this demo only recognizes a
        single sample slug.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
