"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { APP_CONFIG } from "@/config/app-config";
import { LanguageSwitcher } from "@/components/language-switcher";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const FormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (result.success) {
        setIsSubmitted(true);
        toast.success("Check your email", {
          description: "If an account exists, we've sent a password reset link.",
        });
      } else {
        toast.error("Something went wrong", {
          description: result.error || "Please try again later.",
        });
      }
    } catch (error) {
      toast.error("Connection error", {
        description: "Unable to connect to the server. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <>
        <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
          <div className="space-y-4 text-center">
            <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <Mail className="text-primary h-8 w-8" />
            </div>
            <h1 className="text-2xl font-medium">Check your email</h1>
            <p className="text-muted-foreground text-sm">
              We&apos;ve sent a password reset link to your email address. Please check your inbox
              and spam folder.
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground text-center text-sm">
              Didn&apos;t receive the email?{" "}
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-primary hover:underline"
              >
                Try again
              </button>
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to login</Link>
            </Button>
          </div>
        </div>

        <div className="absolute bottom-5 flex w-full justify-between px-10">
          <div className="text-sm">{APP_CONFIG.copyright}</div>
          <LanguageSwitcher variant="compact" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-medium">Forgot password?</h1>
          <p className="text-muted-foreground text-sm">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>
        <div className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>

      <div className="absolute top-5 flex w-full justify-end px-10">
        <div className="text-muted-foreground text-sm">
          Remember your password?{" "}
          <Link prefetch={false} className="text-foreground" href="/login">
            Sign in
          </Link>
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <LanguageSwitcher variant="compact" />
      </div>
    </>
  );
}
