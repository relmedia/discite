"use client";

import { Shield, Layers, Users2, BarChart3, Globe, Zap } from "lucide-react";

export function FeaturesSection() {
  return (
    <section className="container mx-auto py-16 md:py-24">
      <div className="flex flex-col items-center gap-4 text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Powerful Features for Modern Education
        </h2>
        <p className="max-w-[700px] text-lg text-muted-foreground">
          Everything you need to manage your educational institution efficiently
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Feature
          icon={<Shield className="h-6 w-6" />}
          title="Role-Based Security"
          description="5-tier hierarchical role system: Superadmin, Admin, Team Leader, Trainer, and Student with granular permissions."
        />
        <Feature
          icon={<Layers className="h-6 w-6" />}
          title="Multi-Tenant Architecture"
          description="Fully isolated tenant environments for different organizations with their own users and data."
        />
        <Feature
          icon={<Users2 className="h-6 w-6" />}
          title="Group Management"
          description="Organize students into groups with dedicated team leaders and trainers for structured learning."
        />
        <Feature
          icon={<BarChart3 className="h-6 w-6" />}
          title="Analytics & Reporting"
          description="Track student progress, performance metrics, and generate comprehensive reports."
        />
        <Feature
          icon={<Globe className="h-6 w-6" />}
          title="OAuth Integration"
          description="Seamless authentication with Google OAuth alongside traditional email/password login."
        />
        <Feature
          icon={<Zap className="h-6 w-6" />}
          title="Fast & Reliable"
          description="Built with modern technologies for optimal performance and scalability."
        />
      </div>
    </section>
  );
}

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function Feature({ icon, title, description }: FeatureProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-6 transition-colors hover:bg-accent">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        {icon}
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
