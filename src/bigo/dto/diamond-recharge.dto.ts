import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsNumber,
  Length,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DiamondRechargeDto {
  @ApiProperty({
    description:
      'bigo_id of the user that need to be recharged (NOT the client_id)',
    example: '52900149',
  })
  @IsString()
  @IsNotEmpty()
  recharge_bigoid: string;

  @ApiProperty({
    description:
      'Request serial number, should be unique, easier to track request. Only contain numbers and lowercase letters. The length must be between 13 and 32',
    example: '83jyhm2784089j',
  })
  @IsString()
  @IsNotEmpty()
  @Length(13, 32)
  @Matches(/^[a-z0-9]+$/, {
    message: 'seqid must contain only lowercase letters and numbers',
  })
  seqid: string;

  @ApiProperty({
    description:
      '3rd business recharge orderid, should be unique. Only contain numbers, uppercase and lowercase letters, and underscores. The length must be no more than 40',
    example: 'order_123456789',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 40)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'bu_orderid must contain only letters, numbers and underscores',
  })
  bu_orderid: string;

  @ApiProperty({
    description: 'diamond amount required to be recharged',
    example: 712,
  })
  @IsInt()
  @Min(1)
  value: number;

  @ApiProperty({
    description:
      'the payment fee for users to recharge diamonds; the incoming value can have up to two decimal points. The value must be no more than 99999999999.00',
    example: 711.9,
  })
  @IsNumber()
  @Min(0.01)
  @Max(99999999999.0)
  @Type(() => Number)
  total_cost: number;

  @ApiProperty({
    description: 'The currency used by the user for payment',
    example: 'USD',
    enum: [
      'USD', // United States Dollar
      'CNY', // Chinese Yuan
      'TWD', // New Taiwan Dollar
      'MYR', // Malaysian Ringgit
      'THB', // Thai Baht
      'TRY', // Turkish Lira
      'PHP', // Philippine Peso
      'AUD', // Australian Dollar
      'IDR', // Indonesian Rupiah
      'KRW', // Korean Won
      'INR', // Indian Rupee
      'HKD', // Hong Kong Dollar
      'SGD', // Singapore Dollar
      'MMK', // Myanmar Kyat
      'JPY', // Japanese Yen
      'EUR', // Euro
      'NGN', // Nigerian Naira
      'DKK', // Danish Krone
      'UAH', // Ukrainian Hryvnia
      'ILS', // Israeli Shekel
      'IQD', // Iraqi Dinar
      'RUB', // Russian Ruble
      'BGN', // Bulgarian Lev
      'HRK', // Croatian Kuna
      'CHF', // Swiss Franc
      'CAD', // Canadian Dollar
      'GHS', // Ghanaian Cedi
      'HUF', // Hungarian Forint
      'ZAR', // South African Rand
      'QAR', // Qatari Riyal
      'KZT', // Kazakhstani Tenge
      'COP', // Colombian Peso
      'CRC', // Costa Rican Colón
      'TZS', // Tanzanian Shilling
      'EGP', // Egyptian Pound
      'RSD', // Serbian Dinar
      'MXN', // Mexican Peso
      'BDT', // Bangladeshi Taka
      'PKR', // Pakistani Rupee
      'PYG', // Paraguayan Guaraní
      'BRL', // Brazilian Real
      'NOK', // Norwegian Krone
      'CZK', // Czech Koruna
      'MAD', // Moroccan Dirham
      'LKR', // Sri Lankan Rupee
      'NZD', // New Zealand Dollar
      'CLP', // Chilean Peso
      'GEL', // Georgian Lari
      'SAR', // Saudi Riyal
      'PLN', // Polish Złoty
      'MOP', // Macanese Pataca
      'BOB', // Bolivian Boliviano
      'SEK', // Swedish Krona
      'GBP', // British Pound Sterling
      'PEN', // Peruvian Sol
      'JOD', // Jordanian Dinar
      'RON', // Romanian Leu
      'KES', // Kenyan Shilling
      'VND', // Vietnamese Dong
      'DZD', // Algerian Dinar
      'AED', // United Arab Emirates Dirham
      'LBP', // Lebanese Pound
    ],
  })
  @IsString()
  @IsNotEmpty()
  currency: string;
}
