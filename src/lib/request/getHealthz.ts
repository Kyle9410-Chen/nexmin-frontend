import { api } from "@/lib/request/api";

export interface Healthz {
  status: string;
}

export function getHealthz(): Promise<Healthz> {
  return api<Healthz>("/api/healthz");
}
