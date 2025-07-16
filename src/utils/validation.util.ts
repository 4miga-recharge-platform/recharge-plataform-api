import { BadRequestException } from '@nestjs/common';

/**
 *
 * @param data
 * @param requiredFields
 */
export function validateRequiredFields<T extends object>(data: Partial<T>, requiredFields: string[]) {
  for (const field of requiredFields) {
    const value = data[field];

    // Verificar se o campo existe e não é null/undefined
    if (value === null || value === undefined) {
      throw new BadRequestException(`Field '${field}' is required and cannot be empty`);
    }

    // Verificar strings vazias
    if (typeof value === 'string' && value.trim() === '') {
      throw new BadRequestException(`Field '${field}' is required and cannot be empty`);
    }

    // Verificar números (0 é válido, mas null/undefined não)
    if (typeof value === 'number' && (value === null || value === undefined)) {
      throw new BadRequestException(`Field '${field}' is required and cannot be empty`);
    }
  }
}
