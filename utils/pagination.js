export const getPagination = (query, { defaultLimit = 12, maxLimit = 100 } = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

export const paginated = ({ items, total, page, limit }) => ({
  items,
  pagination: { page, limit, total, pages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 }
});
