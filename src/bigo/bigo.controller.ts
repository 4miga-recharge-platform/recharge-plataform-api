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

  @Get('test-signature')
  @ApiOperation({ summary: 'Test signature generation (development only)' })
  @ApiResponse({ status: 200, description: 'Signature test result' })
  async testSignature() {
    return this.bigoService.testSignature();
  }

  @Get('logs')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recharge logs' })
  @ApiResponse({ status: 200, description: 'Recharge logs retrieved successfully' })
  async getLogs(@Query('limit') limit = 10) {
    return this.bigoService.getRechargeLogs(Number(limit));
  }

  @Get('test-connectivity')
  @ApiOperation({ summary: 'Test connectivity with Bigo API domains' })
  @ApiResponse({ status: 200, description: 'Connectivity test results' })
  async testConnectivity() {
    return this.bigoService.testConnectivity();
  }

  @Get('retry-stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get retry queue statistics' })
  @ApiResponse({ status: 200, description: 'Retry statistics' })
  async getRetryStats() {
    return this.bigoService.getRetryStats();
  }
}
