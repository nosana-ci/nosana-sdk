export type FilterOperators<T> =
  | { $eq: T }
  | { $ne: T }
  | (T extends number ? { $gt?: T; $gte?: T; $lt?: T; $lte?: T } : {})
  | (T extends Date ? { $gt?: T; $lt?: T } : {});

type FieldFilter<T> = {
  [K in keyof T]?: FilterOperators<T[K]>;
};

export type Filters<T> =
  | FieldFilter<T>
  | { $and: Filters<T>[] }
  | { $or: Filters<T>[] }
  | { $not: Filters<T> };

export type EventCallback<T> = (data: T) => void;
export type InsertEvent<T> = ['insert', EventCallback<T>];
export type UpdateEvent<T> = ['update', EventCallback<T>, Filters<T>];
