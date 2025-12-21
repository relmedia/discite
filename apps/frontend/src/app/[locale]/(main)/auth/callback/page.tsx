"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      toast.error("Authentication failed", {
        description: "There was an error signing in with Google. Please try again.",
      });
      router.push("/auth/v2/login");
      return;
    }

    if (token) {
      // Store the token
      if (typeof window !== "undefined") {
        localStorage.setItem("auth-token", token);
      }

      toast.success("Login successful!", {
        description: "You have been authenticated with Google.",
      });

      // Redirect to dashboard
      router.push("/dashboard");
    } else {
      router.push("/auth/v2/login");
    }
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}
