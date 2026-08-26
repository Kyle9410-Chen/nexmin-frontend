// =========================
// API Error
//
// The backend answers failures with RFC 9457 application/problem+json
// (summer/pkg/problem), so `detail` is the human-readable field.
// =========================
export interface ApiError extends Error {
  status: number;
  message: string;
  data?: unknown;
}

// =========================
// PaginatedResponse
// =========================
export interface PaginatedResponse<ItemType> {
  items: ItemType[];
  currentPage: number;
  hasNextPage: boolean;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
