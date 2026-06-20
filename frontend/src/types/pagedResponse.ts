export interface PagedResponse<T> {
  data: T[];

  page: number;

  pageSize: number;

  totalItems: number;

  totalPages: number;
}