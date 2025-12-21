"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Users, Target } from "lucide-react";

export function HeroSection() {
  return (
    <section className="container mx-auto flex flex-col items-center gap-8 pt-20 pb-16 md:pt-32 md:pb-24">
      <div className="flex max-w-[980px] flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Transform Your{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Learning Experience
          </span>
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          A comprehensive learning management platform designed for educational institutions.
          Manage students, trainers, and teams with powerful role-based access control.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Sign In
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 pt-16 md:grid-cols-3 w-full max-w-5xl">
        <FeatureCard
          icon={<BookOpen className="h-10 w-10 text-primary" />}
          title="Structured Learning"
          description="Organize courses, groups, and learning paths for efficient knowledge transfer."
        />
        <FeatureCard
          icon={<Users className="h-10 w-10 text-primary" />}
          title="Team Management"
          description="Manage teams with dedicated team leaders, trainers, and students in hierarchical structure."
        />
        <FeatureCard
          icon={<Target className="h-10 w-10 text-primary" />}
          title="Role-Based Access"
          description="5-tier role system from Superadmin to Student with granular permissions."
        />
      </div>
    </section>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-6 text-center transition-colors hover:border-primary/50">
      <div className="rounded-full bg-primary/10 p-3">{icon}</div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
