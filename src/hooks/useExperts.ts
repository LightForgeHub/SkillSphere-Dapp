"use client";

import { useQuery } from "@tanstack/react-query";
import { Expert } from "@/utils/types/types";
import { QueryClient } from "@tanstack/react-query";

export async function fetchExperts(): Promise<Expert[]> {
  const res = await fetch("/api/experts");
  if (!res.ok) {
    throw new Error("Failed to fetch experts");
  }
  return res.json();
}

export async function fetchExpertById(id: string): Promise<Expert> {
  const res = await fetch(`/api/experts/${id}`);
  if (!res.ok) {
    throw new Error("Failed to fetch expert");
  }
  return res.json();
}

export function useExperts() {
  return useQuery({
    queryKey: ["experts"],
    queryFn: fetchExperts,
  });
}

export function useExpert(id: string) {
  return useQuery({
    queryKey: ["experts", id],
    queryFn: () => fetchExpertById(id),
    enabled: !!id,
  });
}

export function prefetchExpert(queryClient: QueryClient, id: string) {
  return queryClient.prefetchQuery({
    queryKey: ["experts", id],
    queryFn: () => fetchExpertById(id),
  });
}
