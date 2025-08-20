export interface PaginationData<T> {
  data: T[];
  meta: {
    limit: number;
    currentPage: number;
    lastPage: number;
    totalPages?: number;
  };
}

export function paginate<T>(
  array: T[],
  size: number,
  page: number,
  totalPages?: number,
): PaginationData<T> {
  let data: T[];
  if (size * (page - 1) > array.length) data = [];
  else
    data = array.slice(size * (page - 1), Math.min(size * page, array.length));
  const lastPage = Math.ceil(array.length / size);

  return {
    data,
    meta: {
      limit: size,
      currentPage: page,
      lastPage,
      totalPages,
    },
  };
}
