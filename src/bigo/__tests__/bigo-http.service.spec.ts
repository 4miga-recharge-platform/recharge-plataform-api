import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { BigoHttpService } from '../http/bigo-http.service';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';

// Mock env module to control environment values during tests
jest.mock('src/env', () => ({
  env: {
    BIGO_HOST_DOMAIN: 'test.bigo.com',
    BIGO_CLIENT_ID: 'test-client-id',
    BIGO_CLIENT_SECRET: 'test-client-secret',
    BIGO_RESELLER_BIGOID: 'test-reseller-id',
    BIGO_ENABLED: true,
  },
}));

describe('BigoHttpService', () => {
  let service: BigoHttpService;
  let httpService: any;

  const fixedTimestamp = 1700000000000;
  const path = '/sign/agent/recharge_pre_check';
  const body = { seqid: 'seq-123' };

  beforeEach(async () => {
    const mockHttpService = {
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BigoHttpService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<BigoHttpService>(BigoHttpService);
    httpService = module.get(HttpService);

    jest.spyOn(Date, 'now').mockReturnValue(fixedTimestamp);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should POST to correct URL with required headers and return data on success (rescode 0)', async () => {
    const expectedData = { rescode: 0, success: true };
    httpService.post.mockReturnValue(of({ data: expectedData }));

    const result = await service.post(path, body);

    const expectedUrl = `https://test.bigo.com${path}`;
    // Compute expected signature deterministically
    const canonical = `test-client-id${fixedTimestamp}${JSON.stringify(body)}`;
    const expectedSignature = crypto
      .createHmac('sha256', 'test-client-secret')
      .update(canonical)
      .digest('hex');

    expect(httpService.post).toHaveBeenCalledTimes(1);
    const callArgs = httpService.post.mock.calls[0];
    expect(callArgs[0]).toBe(expectedUrl);
    expect(callArgs[1]).toEqual(body);

    const config = callArgs[2];
    expect(config.headers['Content-Type']).toBe('application/json');
    expect(config.headers['bigo-client-id']).toBe('test-client-id');
    expect(config.headers['bigo-oauth-signature']).toBe(expectedSignature);
    expect(config.headers['bigo-timestamp']).toBe(fixedTimestamp);
    expect(config.timeout).toBe(10000);
    expect(typeof config.validateStatus).toBe('function');

    expect(result).toEqual(expectedData);
  });

  it('should map BIGO error codes to BadRequestException', async () => {
    httpService.post.mockReturnValue(of({ data: { rescode: 7212001 } }));

    await expect(service.post(path, body)).rejects.toThrow(BadRequestException);
    await expect(service.post(path, body)).rejects.toThrow('BIGO recharge API is disabled');
  });

  it('should throw ServiceUnavailableException on request timeout', async () => {
    const err = Object.assign(new Error('timeout'), { code: 'ECONNABORTED' });
    httpService.post.mockReturnValue(throwError(() => err));

    await expect(service.post(path, body)).rejects.toThrow(ServiceUnavailableException);
    await expect(service.post(path, body)).rejects.toThrow('BIGO request timeout');
  });

  it('should throw ServiceUnavailableException on DNS/connection errors', async () => {
    const err1 = Object.assign(new Error('not found'), { code: 'ENOTFOUND' });
    httpService.post.mockReturnValueOnce(throwError(() => err1));
    await expect(service.post(path, body)).rejects.toThrow('BIGO service unavailable');

    const err2 = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' });
    httpService.post.mockReturnValueOnce(throwError(() => err2));
    await expect(service.post(path, body)).rejects.toThrow('BIGO service unavailable');
  });

  it('should prefix https:// when BIGO_HOST_DOMAIN has no scheme', async () => {
    const { env } = require('src/env');
    env.BIGO_HOST_DOMAIN = 'another.bigo.host';
    httpService.post.mockReturnValue(of({ data: { rescode: 0 } }));

    await service.post('/sign/agent/rs_recharge', body);

    const callArgs = httpService.post.mock.calls[0];
    expect(callArgs[0]).toBe('https://another.bigo.host/sign/agent/rs_recharge');
  });

  it('should not double-prefix when BIGO_HOST_DOMAIN already includes http(s) scheme', async () => {
    const { env } = require('src/env');
    env.BIGO_HOST_DOMAIN = 'http://api.bigo.local';
    httpService.post.mockReturnValue(of({ data: { rescode: 0 } }));

    await service.post('/sign/agent/disable', body);

    const callArgs = httpService.post.mock.calls[0];
    expect(callArgs[0]).toBe('http://api.bigo.local/sign/agent/disable');
  });
});
