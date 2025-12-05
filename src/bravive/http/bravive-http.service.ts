import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { env } from '../../env';
import { AxiosRequestConfig, AxiosError } from 'axios';

@Injectable()
export class BraviveHttpService {
  private readonly logger = new Logger(BraviveHttpService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = env.BRAVIVE_BASE_URL || 'https://app.bravive.com/api/v1';
  }

  /**
   * Generates headers with Bearer Token authentication
   */
  private getHeaders(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Makes POST request to Bravive API
   */
  async post<T = any>(endpoint: string, data: any, token: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders(token);

    this.logger.debug(`POST ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post<T>(url, data, { headers }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'POST', url);
      throw error;
    }
  }

  /**
   * Makes GET request to Bravive API
   */
  async get<T = any>(
    endpoint: string,
    token: string,
    params?: Record<string, any>,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders(token);

    const config: AxiosRequestConfig = {
      headers,
      params,
    };

    this.logger.debug(`GET ${url}`, params);

    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(url, config),
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'GET', url);
      throw error;
    }
  }

  /**
   * Handles HTTP request errors
   */
  private handleError(error: any, method: string, url: string): void {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      const data = error.response?.data;

      this.logger.error(
        `${method} ${url} failed: ${status} ${statusText}`,
        data,
      );

      // Re-throw with clearer message
      throw new Error(
        `Bravive API Error (${status}): ${statusText || error.message}`,
      );
    }

    this.logger.error(`${method} ${url} failed:`, error.message);
    throw error;
  }
}
