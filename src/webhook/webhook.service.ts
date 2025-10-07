import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface StoreWebhookConfig {
  storeId: string;
  webhookUrl: string;
  storeName: string;
}

export interface ProductUpdateWebhook {
  productId: string;
  action: 'created' | 'updated' | 'deleted';
  timestamp: string;
}

export interface PackageUpdateWebhook {
  packageId: string;
  storeId: string;
  action: 'created' | 'updated' | 'deleted';
  timestamp: string;
}

export interface StoreUpdateWebhook {
  storeId: string;
  action: 'created' | 'updated' | 'deleted';
  timestamp: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private storeWebhooks: StoreWebhookConfig[] = [];

  constructor() {
    this.loadStoreWebhooks();
  }

  private loadStoreWebhooks(): void {
    try {
      const webhooksConfig = process.env.STORE_WEBHOOKS;
      console.log('🔍 DEBUG: Raw STORE_WEBHOOKS value:', webhooksConfig);
      console.log('🔍 DEBUG: STORE_WEBHOOKS type:', typeof webhooksConfig);
      console.log('🔍 DEBUG: STORE_WEBHOOKS length:', webhooksConfig?.length);

      if (webhooksConfig) {
        this.storeWebhooks = JSON.parse(webhooksConfig);
        console.log('🔍 DEBUG: Parsed webhooks successfully:', this.storeWebhooks);
        this.logger.log(`Loaded ${this.storeWebhooks.length} store webhook configurations`);
        this.storeWebhooks.forEach(store => {
          this.logger.log(`Store: ${store.storeName} (${store.storeId}) -> ${store.webhookUrl}`);
        });
      } else {
        this.logger.warn('STORE_WEBHOOKS not configured. Webhooks will not be sent.');
      }
    } catch (error) {
      console.error('🔍 DEBUG: JSON parse error details:', error);
      console.error('🔍 DEBUG: Error message:', error.message);
      console.error('🔍 DEBUG: Error stack:', error.stack);
      this.logger.error('Failed to parse STORE_WEBHOOKS configuration:', error.message);
      this.storeWebhooks = [];
    }
  }

  // Products are global - notify ALL stores
  async notifyProductUpdate(productId: string, action: 'created' | 'updated' | 'deleted'): Promise<void> {
    console.log('🔍 DEBUG: notifyProductUpdate called with:', { productId, action });
    console.log('🔍 DEBUG: Current storeWebhooks count:', this.storeWebhooks.length);

    if (this.storeWebhooks.length === 0) {
      this.logger.debug('No store webhooks configured, skipping product webhook');
      return;
    }

    const webhookData: ProductUpdateWebhook = {
      productId,
      action,
      timestamp: new Date().toISOString(),
    };

    console.log('🔍 DEBUG: Product webhook data to send:', webhookData);
    console.log('🔍 DEBUG: Will send to stores:', this.storeWebhooks.map(s => `${s.storeName} (${s.storeId})`));

    // Send to ALL stores (products are global)
    const promises = this.storeWebhooks.map(store =>
      this.sendWebhook(store, '/api/revalidate-products', webhookData)
    );

    try {
      await Promise.allSettled(promises);
      this.logger.log(`Product webhook sent to ${this.storeWebhooks.length} stores: ${productId} ${action}`);
    } catch (error) {
      this.logger.error(`Failed to send product webhook for ${productId}:`, error.message);
    }
  }

  // Packages are store-specific - notify only the specific store
  async notifyPackageUpdate(
    packageId: string,
    storeId: string,
    action: 'created' | 'updated' | 'deleted',
  ): Promise<void> {
    console.log('🔍 DEBUG: notifyPackageUpdate called with:', { packageId, storeId, action });
    console.log('🔍 DEBUG: Current storeWebhooks count:', this.storeWebhooks.length);

    if (this.storeWebhooks.length === 0) {
      this.logger.debug('No store webhooks configured, skipping package webhook');
      return;
    }

    const store = this.storeWebhooks.find(s => s.storeId === storeId);
    console.log('🔍 DEBUG: Found store for package update:', store);

    if (!store) {
      this.logger.warn(`No webhook configured for store ${storeId}, skipping package webhook`);
      return;
    }

    const webhookData: PackageUpdateWebhook = {
      packageId,
      storeId,
      action,
      timestamp: new Date().toISOString(),
    };

    console.log('🔍 DEBUG: Package webhook data to send:', webhookData);
    console.log('🔍 DEBUG: Will send to store:', `${store.storeName} (${store.storeId})`);

    try {
      await this.sendWebhook(store, '/api/revalidate-products', webhookData);
      this.logger.log(`Package webhook sent successfully: ${packageId} ${action} for store ${store.storeName} (${storeId})`);
    } catch (error) {
      this.logger.error(`Failed to send package webhook for ${packageId}:`, error.message);
    }
  }

  // Store updates are store-specific - notify only the specific store
  async notifyStoreUpdate(storeId: string, action: 'created' | 'updated' | 'deleted'): Promise<void> {
    if (this.storeWebhooks.length === 0) {
      this.logger.debug('No store webhooks configured, skipping store webhook');
      return;
    }

    const store = this.storeWebhooks.find(s => s.storeId === storeId);
    if (!store) {
      this.logger.warn(`No webhook configured for store ${storeId}, skipping store webhook`);
      return;
    }

    const webhookData: StoreUpdateWebhook = {
      storeId,
      action,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.sendWebhook(store, '/api/webhook/store-update', webhookData);
      this.logger.log(`Store webhook sent successfully: ${storeId} ${action} for store ${store.storeName}`);
    } catch (error) {
      this.logger.error(`Failed to send store webhook for ${storeId}:`, error.message);
    }
  }

  private async sendWebhook(store: StoreWebhookConfig, endpoint: string, data: any): Promise<void> {
    const fullUrl = `${store.webhookUrl}${endpoint}`;

    console.log('🔍 DEBUG: ===== WEBHOOK REQUEST =====');
    console.log('🔍 DEBUG: Store:', store.storeName);
    console.log('🔍 DEBUG: Store ID:', store.storeId);
    console.log('🔍 DEBUG: Webhook URL:', store.webhookUrl);
    console.log('🔍 DEBUG: Endpoint:', endpoint);
    console.log('🔍 DEBUG: Full URL:', fullUrl);
    console.log('🔍 DEBUG: Data being sent:', JSON.stringify(data, null, 2));
    console.log('🔍 DEBUG: ==============================');

    try {
      const token = process.env.REVALIDATE_TOKEN;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(fullUrl, data, {
        timeout: 5000, // 5 second timeout
        headers,
      });

      console.log('✅ DEBUG: Webhook SUCCESS for', store.storeName);
      console.log('✅ DEBUG: Response status:', response.status);
      console.log('✅ DEBUG: Response data:', response.data);

    } catch (error) {
      console.error('❌ DEBUG: Webhook FAILED for', store.storeName);
      console.error('❌ DEBUG: Error message:', error.message);
      console.error('❌ DEBUG: Error response status:', error.response?.status);
      console.error('❌ DEBUG: Error response data:', error.response?.data);
      console.error('❌ DEBUG: Full error:', error);

      this.logger.error(`Failed to send webhook to ${store.storeName} (${store.storeId}):`, error.message);
      throw error; // Re-throw to be handled by caller
    }
  }
}
