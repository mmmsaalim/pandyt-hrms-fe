export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends PaginationMeta {
  items: T[];
}

export interface PaginationRequest {
  page?: number;
  limit?: number;
}

export const DEFAULT_PAGINATION: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 5,
  totalPages: 1,
};

