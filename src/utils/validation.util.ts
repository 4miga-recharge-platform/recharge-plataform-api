import { BadRequestException } from '@nestjs/common';

/**
 *
 * @param data
 * @param requiredFields
 */
export function validateRequiredFields<T extends object>(data: Partial<T>, requiredFields: string[]) {
  for (const field of requiredFields) {
    if (!data[field] || typeof data[field] !== 'string' || (data[field] as string).trim() === '') {
      throw new BadRequestException(`Field '${field}' is required and cannot be empty`);
    }
  }
}
