import type { Condition } from '@/types/module';

export type GetFieldValue = (fieldId: string) => unknown;

/**
 * Evaluates a condition against current form values.
 * Used for showIf (show field?) and requiredIf (field required?).
 */
export function evaluateCondition(
  condition: Condition,
  getFieldValue: GetFieldValue
): boolean {
  const value = getFieldValue(condition.field);
  const valueArray = Array.isArray(value) ? value : [];

  switch (condition.op) {
    case 'eq':
      return value === condition.value;
    case 'neq':
      return value !== condition.value;
    case 'in': {
      const arr = Array.isArray(condition.value) ? condition.value : [];
      if (arr.includes(value)) return true;
      if (typeof value === 'number' && arr.includes(String(value))) return true;
      return false;
    }
    case 'notIn': {
      const arr = Array.isArray(condition.value) ? condition.value : [];
      if (arr.includes(value)) return false;
      if (typeof value === 'number' && arr.includes(String(value))) return false;
      return true;
    }
    case 'contains':
      return valueArray.includes(condition.value);
    case 'notContains':
      return !valueArray.includes(condition.value);
    case 'intersects': {
      const arr = Array.isArray(condition.value) ? condition.value : [];
      return arr.some((item) => valueArray.includes(item));
    }
    case 'notIntersects': {
      const arr = Array.isArray(condition.value) ? condition.value : [];
      return !arr.some((item) => valueArray.includes(item));
    }
    case 'empty':
      return (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      );
    case 'notEmpty':
      return (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        (!Array.isArray(value) || value.length > 0)
      );
    default:
      return false;
  }
}
