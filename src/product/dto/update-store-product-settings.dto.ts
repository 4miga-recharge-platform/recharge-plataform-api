import { PartialType } from '@nestjs/swagger';
import { CreateStoreProductSettingsDto } from './create-store-product-settings.dto';

export class UpdateStoreProductSettingsDto extends PartialType(CreateStoreProductSettingsDto) {}
