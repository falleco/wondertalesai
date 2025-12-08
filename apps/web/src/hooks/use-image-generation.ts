import { useState } from "react";

export function useImageGeneration() {
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function startGeneration(prompt: string) {
    try {
      setError(null);
      setImages([]);
      setIsLoading(true);

      const response = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate images");
      }

      setImages(data.images);
    } catch (error) {
      console.error("Error fetching images:", error);

      setError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    images,
    error,
    startGeneration,
  };
}
