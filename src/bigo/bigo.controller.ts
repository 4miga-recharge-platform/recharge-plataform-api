import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BigoService } from './bigo.service';
import { RechargePrecheckDto } from './dto/recharge-precheck.dto';
import { DiamondRechargeDto } from './dto/diamond-recharge.dto';
import { DisableRechargeDto } from './dto/disable-recharge.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('bigo')
@Controller('bigo')
export class BigoController {
  constructor(private readonly bigoService: BigoService) {}

    @Post('recharge-precheck')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if bigoid can be recharged and reseller balance' })
  @ApiResponse({ status: 200, description: 'Precheck completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async rechargePrecheck(@Body() dto: RechargePrecheckDto) {
    return this.bigoService.rechargePrecheck(dto);
  }

  // TODO: Remove this after testing (it returns the debug info)
  //
  // async rechargePrecheck(@Body() dto: RechargePrecheckDto, @Req() req: any) {
  //   // Get client IP for debugging
  //   const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  //   const forwardedFor = req.headers['x-forwarded-for'];
  //   const realIp = req.headers['x-real-ip'];

  //   // Add debug info to response
  //   const debugInfo = {
  //     clientIp,
  //     forwardedFor,
  //     realIp,
  //     headers: req.headers,
  //     timestamp: new Date().toISOString()
  //   };

  //   try {
  //     const result = await this.bigoService.rechargePrecheck(dto);
  //     return {
  //       ...result,
  //       debug: debugInfo
  //     };
  //   } catch (error) {
  //     return {
  //       error: error.message,
  //       debug: debugInfo
  //     };
  //   }
  // }

  @Post('diamond-recharge')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recharge user with diamonds using dealer quota' })
  @ApiResponse({ status: 200, description: 'Recharge completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters or insufficient balance' })
  async diamondRecharge(@Body() dto: DiamondRechargeDto) {
    return this.bigoService.diamondRecharge(dto);
  }

  @Post('disable-recharge')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable all recharge APIs (emergency use only)' })
  @ApiResponse({ status: 200, description: 'Recharge disabled successfully' })
  @ApiResponse({ status: 500, description: 'Internal error' })
  async disableRecharge(@Body() dto: DisableRechargeDto) {
    return this.bigoService.disableRecharge(dto);
  }

  @Get('logs')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recharge logs' })
  @ApiResponse({ status: 200, description: 'Recharge logs retrieved successfully' })
  async getLogs(@Query('limit') limit = 10) {
    return this.bigoService.getRechargeLogs(Number(limit));
  }

  @Get('retry-stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get retry queue statistics' })
  @ApiResponse({ status: 200, description: 'Retry statistics' })
  async getRetryStats() {
    return this.bigoService.getRetryStats();
  }

  @Post('test-signature')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Test signature generation with Bigo test endpoint',
    description: 'This endpoint validates if the RSA signature is correctly generated. Use this to debug authentication issues before testing other endpoints.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Signature test completed. If success=true, the signature is valid.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        response: { type: 'object' },
        timestamp: { type: 'string' },
        endpoint: { type: 'string' },
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Signature test failed - check BIGO_PRIVATE_KEY and BIGO_CLIENT_ID' })
  async testSignature() {
    return this.bigoService.testSignature();
  }

}
