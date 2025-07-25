import { BadRequestException } from '@nestjs/common';

/**
 *
 * @param data
 * @param requiredFields
 */
export function validateRequiredFields<T extends object>(data: Partial<T>, requiredFields: string[]) {
  for (const field of requiredFields) {
    const value = data[field];

    // Check if field exists and is not null/undefined
    if (value === null || value === undefined) {
      throw new BadRequestException(`Field '${field}' cannot be empty`);
    }

    // Check for empty strings
    if (typeof value === 'string' && value.trim() === '') {
      throw new BadRequestException(`Field '${field}' cannot be empty`);
    }

    // Check numbers (0 is valid, but null/undefined is not)
    if (typeof value === 'number' && (value === null || value === undefined)) {
      throw new BadRequestException(`Field '${field}' cannot be empty`);
    }
  }
}
