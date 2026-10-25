import type { AccuracyResponse, DecisionResponse } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail ?? `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getDecisionView(date: string, cutoff: string) {
  return request<DecisionResponse>(
    `/api/decision-view?delivery_date=${date}&cutoff=${cutoff}`,
  );
}

export function getAccuracy(cutoff: string) {
  return request<AccuracyResponse>(`/api/accuracy?from=2026-01-01&to=2026-01-31&cutoff=${cutoff}`);
}
