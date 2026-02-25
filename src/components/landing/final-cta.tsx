import { Button } from "@/components/ui/button";
import Link from "next/link";

export function FinalCTASection() {
  return (
    <section id="demo" className="py-20 bg-primary/5">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold">
          Ready to Simplify Your Accounting?
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Join hundreds of firms and businesses who trust CORNER for their accounting and tax compliance needs.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/signup">Start Your Free Trial</Link>
          </Button>
          <Button size="lg" variant="outline">
            Schedule a Demo
          </Button>
        </div>
      </div>
    </section>
  );
}
