import { FilterOperators } from '../types';

export function matchValue<T>(value: T, operator: FilterOperators<T>): boolean {
  const isComparable = (v: any): v is number | Date =>
    typeof v === 'number' || v instanceof Date;

  if ('$eq' in operator && value !== operator.$eq) return false;
  if ('$ne' in operator && value === operator.$ne) return false;

  if ('$gt' in operator && isComparable(value) && value <= operator.$gt!)
    return false;
  if ('$gte' in operator && typeof value === 'number' && value < operator.$gte!)
    return false;
  if ('$lt' in operator && isComparable(value) && value >= operator.$lt!)
    return false;
  if ('$lte' in operator && typeof value === 'number' && value > operator.$lte!)
    return false;

  return true;
}
