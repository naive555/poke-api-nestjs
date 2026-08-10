import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { SLOW_REQUEST_THRESHOLD_MS } from '../utility/common.constant';

type AuthenticatedRequest = FastifyRequest & { user?: { id?: string } };

// pino-http picks the error up from the raw response when the response ends.
type ErrorAwareResponse = FastifyReply['raw'] & { err?: Error };

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const startedAt = Date.now();
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<FastifyReply>();
    const handler = `${context.getClass().name}.${context.getHandler().name}`;

    // Bind the context to the request-scoped logger: every line produced while
    // handling this request - including the access log pino-http writes when
    // the response ends - carries it, so there is no second summary line here.
    this.logger.assign({ handler, userId: request.user?.id ?? null });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startedAt;
        if (duration >= SLOW_REQUEST_THRESHOLD_MS) {
          this.logger.warn({ duration }, `${handler} took ${duration}ms`);
        }
      }),
      catchError((error: Error) => {
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        // 4xx are expected client errors: status and route say enough. Only an
        // unexpected failure is worth a stack, and handing the error to
        // pino-http keeps it on the access log line instead of adding a second
        // one - otherwise that line reports a synthetic "failed with status
        // code 500" whose stack points at pino-http itself.
        if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
          (response.raw as ErrorAwareResponse).err = error;
          this.logger.assign({ params: request.params, query: request.query });
        }

        return throwError(() => error);
      }),
    );
  }
}
