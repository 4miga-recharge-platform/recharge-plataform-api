import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, Matches, Min } from 'class-validator';

export enum BigoCurrency {
  USD = 'USD',
  CNY = 'CNY',
  TWD = 'TWD',
  MYR = 'MYR',
  THB = 'THB',
  TRY = 'TRY',
  PHP = 'PHP',
  AUD = 'AUD',
  IDR = 'IDR',
  KRW = 'KRW',
  INR = 'INR',
  HKD = 'HKD',
  SGD = 'SGD',
  MMK = 'MMK',
  JPY = 'JPY',
  EUR = 'EUR',
  NGN = 'NGN',
  DKK = 'DKK',
  UAH = 'UAH',
  ILS = 'ILS',
  IQD = 'IQD',
  RUB = 'RUB',
  BGN = 'BGN',
  HRK = 'HRK',
  CHF = 'CHF',
  CAD = 'CAD',
  GHS = 'GHS',
  HUF = 'HUF',
  ZAR = 'ZAR',
  QAR = 'QAR',
  KZT = 'KZT',
  COP = 'COP',
  CRC = 'CRC',
  TZS = 'TZS',
  EGP = 'EGP',
  RSD = 'RSD',
  MXN = 'MXN',
  BDT = 'BDT',
  PKR = 'PKR',
  PYG = 'PYG',
  BRL = 'BRL',
  NOK = 'NOK',
  CZK = 'CZK',
  MAD = 'MAD',
  LKR = 'LKR',
  NZD = 'NZD',
  CLP = 'CLP',
  GEL = 'GEL',
  SAR = 'SAR',
  PLN = 'PLN',
  MOP = 'MOP',
  BOB = 'BOB',
  SEK = 'SEK',
  GBP = 'GBP',
  PEN = 'PEN',
  JOD = 'JOD',
  RON = 'RON',
  KES = 'KES',
  VND = 'VND',
  DZD = 'DZD',
  AED = 'AED',
  LBP = 'LBP',
}

export class RechargeDto {
  @ApiProperty({
    example: '52900149',
    description: 'BIGO id that needs to be recharged',
  })
  @IsNotEmpty()
  recharge_bigoid!: string;

  @ApiProperty({
    example: 'ORDER_ABC_123',
    description: 'Unique business order id [0-9A-Za-z_], max 40',
  })
  @Matches(/^[0-9A-Za-z_]{1,40}$/)
  bu_orderid!: string;

  @ApiProperty({ example: 712, description: 'Diamond amount to be recharged' })
  @IsInt()
  @Min(1)
  value!: number;

  @ApiProperty({
    example: 711.9,
    description: 'Payment fee (up to 2 decimal places)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  total_cost!: number;

  @ApiProperty({
    enum: BigoCurrency,
    description: 'User currency used for payment',
  })
  @IsEnum(BigoCurrency)
  currency!: BigoCurrency;
}
