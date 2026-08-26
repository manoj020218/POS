import type { PaginatedResult, PaginationInput, PaginationMeta } from './catalog.types.js';

export const buildPaginationMeta = ({
  page,
  pageSize,
  totalItems
}: PaginationInput & { totalItems: number }): PaginationMeta => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    page,
    pageSize,
    totalItems,
    totalPages
  };
};

export const paginateItems = <T>(
  items: T[],
  pagination: PaginationInput
): PaginatedResult<T> => {
  const startIndex = (pagination.page - 1) * pagination.pageSize;

  return {
    items: items.slice(startIndex, startIndex + pagination.pageSize),
    meta: buildPaginationMeta({ ...pagination, totalItems: items.length })
  };
};
