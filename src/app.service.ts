import { Injectable } from '@nestjs/common';
import { env } from './env';

@Injectable()
export class AppService {
  getAppStatus(): string {
    return `Server is running! 🚀\n Please check http://localhost:${env.PORT}/api for Swagger docs...`;
  }
}
