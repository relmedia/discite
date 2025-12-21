"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="container mx-auto py-16 md:py-24">
      <div className="flex flex-col items-center gap-6 rounded-lg border bg-muted/50 p-8 text-center md:p-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Ready to Get Started?
        </h2>
        <p className="max-w-[600px] text-lg text-muted-foreground">
          Join thousands of educational institutions using Discite to transform their learning experience.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Create Your Account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Sign In to Your Account
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
