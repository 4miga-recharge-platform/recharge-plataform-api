/**
 * Mock responses for BigoService
 * Used in integration tests to simulate Bigo API responses
 */

export interface BigoPrecheckResponse {
  rescode: number;
  message: string;
}

export interface BigoRechargeResponse {
  rescode: number;
  message: string;
}

export class BigoMock {
  /**
   * Creates a mock successful precheck response
   */
  static createPrecheckSuccess(): BigoPrecheckResponse {
    return {
      rescode: 0,
      message: 'Success',
    };
  }

  /**
   * Creates a mock failed precheck response
   */
  static createPrecheckFailure(
    rescode: number = 7212012,
    message: string = 'Invalid bigoId',
  ): BigoPrecheckResponse {
    return {
      rescode,
      message,
    };
  }

  /**
   * Creates a mock successful recharge response
   */
  static createRechargeSuccess(): BigoRechargeResponse {
    return {
      rescode: 0,
      message: 'Recharge successful',
    };
  }

  /**
   * Creates a mock failed recharge response (rate limit)
   */
  static createRechargeRateLimit(): BigoRechargeResponse {
    return {
      rescode: 7212012,
      message: 'request frequently, just wait a second to call',
    };
  }

  /**
   * Creates a mock failed recharge response (generic error)
   */
  static createRechargeFailure(
    rescode: number = 500001,
    message: string = 'Other errors, contact Bigo team',
  ): BigoRechargeResponse {
    return {
      rescode,
      message,
    };
  }
}

