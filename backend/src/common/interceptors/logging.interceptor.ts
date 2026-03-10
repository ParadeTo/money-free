import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * 全局日志拦截器
 * 记录每个请求的详细信息和响应时间
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, body, query } = request;
    const userAgent = request.get('user-agent') || '';

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = response;
          const contentLength = response.get('content-length') || 0;
          const responseTime = Date.now() - now;

          // 记录请求日志
          this.logger.log(
            `${method} ${url} ${statusCode} ${responseTime}ms - ${contentLength}bytes - ${ip} - ${userAgent}`,
          );

          // 在开发环境下，记录更多详细信息
          if (process.env.NODE_ENV === 'development') {
            this.logger.debug(`Request body: ${JSON.stringify(body)}`);
            this.logger.debug(`Query params: ${JSON.stringify(query)}`);
          }
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `${method} ${url} ${error.status || 500} ${responseTime}ms - ${ip} - ${userAgent}`,
          );
        },
      }),
    );
  }
}
