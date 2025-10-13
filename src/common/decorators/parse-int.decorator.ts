import { Transform } from 'class-transformer';

/**
 * Custom decorator to parse string values to integers
 *
 * Applies parseInt(value, 10) transformation to ensure numeric fields
 * are properly converted from string inputs (query params, form data).
 *
 * @returns PropertyDecorator
 *
 * @example
 * ```typescript
 * export class CreateInventoryDto {
 *   @ParseInt()
 *   @IsInt()
 *   @Min(0)
 *   initialStock!: number;
 * }
 * ```
 */
export function ParseInt(): PropertyDecorator {
  return Transform(({ value }) => {
    if (value === null || value === undefined || value === '') {
      return value;
    }
    return parseInt(value, 10);
  });
}
