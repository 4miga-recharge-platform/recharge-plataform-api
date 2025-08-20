import { Controller, Get, Logger, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Subscription } from 'rxjs';
import { clearInterval, clearTimeout, setInterval, setTimeout } from 'timers';
import { SseConfirmEmailService } from './sse.confirm-email.service';

@ApiTags('SSE')
@Controller('sse')
export class SseController {
  private readonly logger = new Logger(SseController.name);
  private readonly EMAIL_CONNECTION_TIMEOUT = 60 * 60 * 1000; // 1 hour
  private readonly HEARTBEAT_INTERVAL = 45000; // 45 seconds

  constructor(
    private readonly sseService: SseConfirmEmailService,
  ) {}

  @Get('email-verified/:email')
  @ApiOperation({ summary: 'Subscribe to email verification events' })
  @ApiParam({ name: 'email', description: 'User email to monitor' })
  @ApiResponse({ status: 200, description: 'SSE connection established' })
  async emailVerifiedEvents(
    @Param('email') email: string,
    @Res() res: Response,
  ) {
    const decodedEmail = decodeURIComponent(email);
    this.logger.log(`SSE email connection established for: ${decodedEmail}`);

    this.setupSseHeaders(res);
    this.sendInitialMessage(res, { type: 'connected', message: 'SSE connection established' });

    const subscription = this.sseService.getEmailVerifiedEvents().subscribe({
      next: (event) => {
        this.logger.debug('SSE Event received:', {
          eventEmail: event.email,
          decodedEmail,
          match: event.email === decodedEmail,
        });

        if (event.email === decodedEmail) {
          this.logger.log(`Sending SSE notification for email: ${decodedEmail}`);
          this.sendSseMessage(res, {
            type: 'emailVerified',
            success: true,
            user: event.userData.user,
            access: event.userData.access,
            timestamp: event.timestamp,
          });
        }
      },
      error: (error) => {
        this.logger.error('SSE Email Error:', error);
        this.sendSseMessage(res, { type: 'error', message: 'Internal server error' });
      },
    });

    this.setupConnectionManagement(res, subscription, decodedEmail, this.EMAIL_CONNECTION_TIMEOUT);
  }

  // Private helper methods
  private setupSseHeaders(res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });
  }

  private sendInitialMessage(res: Response, message: any): void {
    res.write(`data: ${JSON.stringify(message)}\n\n`);
  }

  private sendSseMessage(res: Response, data: any): void {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  private setupConnectionManagement(
    res: Response,
    subscription: Subscription,
    identifier: string,
    timeoutMs: number,
  ): void {
    // Set up connection timeout
    const timeoutId = setTimeout(() => {
      this.logger.log(`SSE connection timeout for: ${identifier}`);
      subscription.unsubscribe();
      res.end();
    }, timeoutMs);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        this.sendSseMessage(res, { heartbeat: new Date().toISOString() });
      }
    }, this.HEARTBEAT_INTERVAL);

    // Handle client disconnect
    res.on('close', () => {
      this.logger.log(`SSE connection closed for: ${identifier}`);
      clearTimeout(timeoutId);
      clearInterval(heartbeat);
      subscription.unsubscribe();
    });
  }
}
