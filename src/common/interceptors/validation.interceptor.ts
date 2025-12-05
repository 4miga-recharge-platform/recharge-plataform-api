import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof BadRequestException) {
          const response = error.getResponse() as any;

          // If it's a class-validator validation error
          if (response.message && Array.isArray(response.message)) {
            const validationErrors = response.message.map((msg: string) => {
              // Extract field and message
              const fieldMatch = msg.match(/^([^.]+)/);
              const field = fieldMatch ? fieldMatch[1] : 'field';

              return {
                field,
                message: msg,
              };
            });

            return throwError(
              new BadRequestException({
                message: 'Invalid data',
                errors: validationErrors,
              }),
            );
          }
        }

        return throwError(error);
      }),
    );
  }
}
