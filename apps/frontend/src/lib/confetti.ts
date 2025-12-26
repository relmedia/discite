"use client";

/**
 * Client-side only confetti utility
 * This file ensures confetti is only loaded in the browser
 */

let confettiInstance: any = null;

export async function getConfetti() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!confettiInstance) {
    try {
      const confettiModule = await import("canvas-confetti");
      confettiInstance = confettiModule.default;
    } catch (error) {
      console.error("Failed to load confetti:", error);
      return null;
    }
  }

  return confettiInstance;
}

export async function triggerConfetti(options?: {
  particleCount?: number;
  angle?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
  shapes?: Array<"square" | "circle">;
  gravity?: number;
  drift?: number;
  ticks?: number;
  decay?: number;
  startVelocity?: number;
  zIndex?: number;
}) {
  const confetti = await getConfetti();
  if (!confetti) return;

  return confetti(options);
}

