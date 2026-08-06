import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';
import { cleanupUploadedFiles } from './upload-paths';

@Injectable()
export class UploadedFilesCleanupInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(catchError((error: unknown) => {
      const request = context.switchToHttp().getRequest<{ files?: Express.Multer.File[] }>();
      cleanupUploadedFiles(request.files);
      return throwError(() => error);
    }));
  }
}
