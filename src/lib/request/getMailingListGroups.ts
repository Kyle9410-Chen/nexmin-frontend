import { api } from "@/lib/request/api";
import type { MailingListGroupsResponse } from "@/types/mailingList";

/**
 * Every group in the Workspace account. Takes no parameters — the backend's
 * `ListGroupsHandler` reads nothing off the request and answers from a 5-minute
 * in-process cache.
 */
export function getMailingListGroups(): Promise<MailingListGroupsResponse> {
  return api<MailingListGroupsResponse>("/api/groups");
}
