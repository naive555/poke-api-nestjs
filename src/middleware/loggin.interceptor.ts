import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(this.constructor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { method, originalUrl } = request;
    const userId = request.user?.id ?? 'anonymous';

    return next.handle().pipe(
      tap(() => {
        const delay = Date.now() - now;
        this.logger.log(
          `${method} ${originalUrl} ${response.statusCode} - ${delay}ms - user:${userId}`,
        );
      }),
      catchError((error) => {
        const delay = Date.now() - now;
        this.logger.error(
          `${method} ${originalUrl} ${response.statusCode} - ${delay}ms - user:${userId} - ${error.message}`,
        );
        return throwError(() => error);
      }),
    );
  }
}
