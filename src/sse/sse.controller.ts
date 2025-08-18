import { Controller, Get, Res, Param } from '@nestjs/common';
import { Response } from 'express';
import { SseService } from './sse.service';
import { setInterval, clearInterval } from 'timers';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Get('email-verified/:userId')
  async emailVerifiedEvents(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    // Configure headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Send connection established event
    res.write('data: {"type":"connected","message":"SSE connection established"}\n\n');

    // Subscribe to email verification events
    const subscription = this.sseService.getEmailVerifiedEvents().subscribe({
      next: (event) => {
        // Only send event if it's for the specific user
        if (event.userId === userId) {
          const sseData = `data: ${JSON.stringify({
            type: 'emailVerified',
            success: true,
            user: event.userData,
            timestamp: event.timestamp,
          })}\n\n`;
          res.write(sseData);
        }
      },
      error: (error) => {
        console.error('SSE Error:', error);
        const errorData = `data: ${JSON.stringify({
          type: 'error',
          message: 'Internal server error',
        })}\n\n`;
        res.write(errorData);
      },
    });

    // Handle client disconnection
    res.on('close', () => {
      subscription.unsubscribe();
      res.end();
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeat);
        subscription.unsubscribe();
        return;
      }
      res.write(': heartbeat\n\n');
    }, 30000); // Heartbeat every 30 seconds

    // Clear heartbeat when connection is closed
    res.on('close', () => {
      clearInterval(heartbeat);
    });
  }
}
