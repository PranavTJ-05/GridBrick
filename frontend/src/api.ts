import type { AccuracyResponse, DecisionResponse } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:8000" : "");

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, { signal });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail ?? `Request failed with ${response.status}`);
      }
      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 900));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Unable to fetch data");
}

export function getDecisionView(date: string, cutoff: string, signal?: AbortSignal) {
  return request<DecisionResponse>(
    `/api/decision-view?delivery_date=${date}&cutoff=${cutoff}`,
    signal,
  );
}

export function getAccuracy(cutoff: string, signal?: AbortSignal) {
  return request<AccuracyResponse>(`/api/accuracy?from=2026-01-01&to=2026-01-31&cutoff=${cutoff}`, signal);
}
