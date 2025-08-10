import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import { env } from 'src/env';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class BigoHttpService {
  constructor(private readonly http: HttpService) {}

  private get baseURL(): string {
    const base = env.BIGO_HOST_DOMAIN;
    if (!base) throw new Error('BIGO_HOST_DOMAIN is not configured'); // env requirement
    return /^https?:\/\//.test(base) ? base : `https://${base}`;
  }

  private signRequest(body: unknown, timestamp: number): string {
    const clientId = env.BIGO_CLIENT_ID;
    const clientSecret = env.BIGO_CLIENT_SECRET;
    if (!clientId || !clientSecret)
      throw new Error('BIGO_CLIENT_ID/BIGO_CLIENT_SECRET are not configured'); // env requirement

    // Placeholder: adjust according to BIGO doc "Step 3: Call Api with Signature"
    const canonical = `${clientId}${timestamp}${JSON.stringify(body)}`;
    return crypto.createHmac('sha256', clientSecret).update(canonical).digest('hex');
  }

  private mapBigoError(rescode: number, message?: string): string {
    const errorMap: Record<number, string> = {
      400001: 'Invalid request parameters',
      7212001: 'BIGO recharge API is disabled',
      7212002: 'Third-party recharge API is disabled',
      7212003: 'Request source IP not authorized',
      7212004: 'Recharge BIGO ID does not exist',
      7212005: 'Recharge BIGO ID cannot be recharged',
      7212006: 'Reseller BIGO ID not bound to client_id',
      7212008: 'Diamond amount exceeds upper limit',
      7212009: 'Currency not supported',
      7212010: 'Order ID is duplicated',
      7212011: 'Insufficient balance',
      7212012: 'Request too frequent, please wait',
      7212013: 'Diamond pricing out of range (25-100 diamonds per 1 USD)',
      7212014: 'User area not eligible',
      7212015: 'Recharge not supported in your area',
      500001: 'BIGO internal error',
    };

    return errorMap[rescode] || message || `BIGO error: ${rescode}`;
  }

  async post<T = any>(path: string, body: unknown): Promise<T> {
    const timestamp = Date.now();
    const signature = this.signRequest(body, timestamp);
    const url = `${this.baseURL}${path}`;

    try {
      const response = await firstValueFrom(
        this.http.post<T>(url, body, {
          headers: {
            'Content-Type': 'application/json',
            'bigo-client-id': env.BIGO_CLIENT_ID!,
            'bigo-oauth-signature': signature,
            'bigo-timestamp': timestamp,
          },
          timeout: 10000,
          validateStatus: () => true, // Don't throw on HTTP errors
        }).pipe(
          catchError((error) => {
            if (error.code === 'ECONNABORTED') {
              throw new ServiceUnavailableException('BIGO request timeout');
            }
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
              throw new ServiceUnavailableException('BIGO service unavailable');
            }
            throw new ServiceUnavailableException(`BIGO network error: ${error.message}`);
          })
        )
      );

      // Check BIGO response codes
      const data = response.data as any;
      if (data.rescode !== undefined && data.rescode !== 0) {
        const errorMessage = this.mapBigoError(data.rescode, data.message);
        throw new BadRequestException(errorMessage);
      }

      return data;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException(`Unexpected error: ${error.message}`);
    }
  }
}


