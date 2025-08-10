import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BigoService } from './bigo.service';
// No body for precheck; seqid is generated server-side
import { RechargeDto } from './dto/recharge.dto';

@ApiTags('bigo')
@Controller('bigo')
export class BigoController {
  constructor(private readonly bigoService: BigoService) {}

  @Get()
  @ApiOperation({ summary: 'Get all BIGO recharge records' })
  findAll() {
    return this.bigoService.findAll();
  }

  @Post('precheck')
  @HttpCode(200)
  @ApiOperation({ summary: 'Recharge Precheck (BIGO) — etapa 1' })
  precheck() {
    return this.bigoService.precheck();
  }

  @Post('recharge')
  @HttpCode(200)
  @ApiOperation({ summary: 'Diamond Recharge (BIGO)' })
  recharge(@Body() body: RechargeDto) {
    return this.bigoService.recharge(body);
  }

  @Post('disable')
  @HttpCode(200)
  @ApiOperation({ summary: 'Disable all recharge APIs (BIGO)' })
  disable() {
    return this.bigoService.disable();
  }
}
