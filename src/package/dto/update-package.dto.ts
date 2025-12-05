import { PartialType } from '@nestjs/swagger';
import { CreatePackageDto } from './create-package.dto';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PaymentMethodDto {
  name:
    | 'pix'
    | 'mercado_pago'
    | 'picpay'
    | 'paypal'
    | 'boleto'
    | 'transferencia';
  price: number;
}

export class UpdatePackageDto extends PartialType(CreatePackageDto) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodDto)
  paymentMethods?: PaymentMethodDto[];
}
