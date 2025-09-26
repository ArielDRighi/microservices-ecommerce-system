import { ArgumentMetadata, Injectable, ValidationPipe, Type } from '@nestjs/common';

@Injectable()
export class CustomValidationPipe extends ValidationPipe {
  override async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    // Skip validation for custom parameter decorators (like @CurrentUser())
    if (metadata.type === 'custom') {
      return value;
    }

    // Skip validation for route parameters that are not DTOs
    if (metadata.type === 'param' && !this.isDto(metadata.metatype)) {
      return value;
    }

    // For DTOs and standard request objects, use the parent validation
    return super.transform(value, metadata);
  }

  private isDto(metatype?: Type<unknown>): boolean {
    if (!metatype) return false;

    // Check if the class name ends with 'Dto' or is in a dto folder
    const className = metatype.name;
    return className.endsWith('Dto') || className.endsWith('DTO');
  }
}
