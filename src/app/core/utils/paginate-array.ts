import { DEFAULT_PAGINATION, PaginationMeta } from '../models/pagination.model';

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  return {
    total,
    page: Math.min(Math.max(page, 1), totalPages),
    limit,
    totalPages,
  };
}

export function slicePage<T>(items: T[], page: number, limit: number): T[] {
  const safePage = Math.max(page, 1);
  const start = (safePage - 1) * limit;
  return items.slice(start, start + limit);
}

export function defaultListPagination(limit = 10): PaginationMeta {
  return { ...DEFAULT_PAGINATION, limit };
}
