import { Controller, Get, Res, Param } from '@nestjs/common';
import { Response } from 'express';
import { SseService } from './sse.service';
import { setInterval, clearInterval, setTimeout, clearTimeout } from 'timers';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Get('email-verified/:email')
  async emailVerifiedEvents(
    @Param('email') email: string,
    @Res() res: Response,
  ) {
    // Decode email parameter
    const decodedEmail = decodeURIComponent(email);
    console.log('SSE Connection established for email:', decodedEmail);

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
        console.log('SSE Event received:', {
          eventEmail: event.email,
          decodedEmail,
          match: event.email === decodedEmail
        });

        // Only send event if it's for the specific email
        if (event.email === decodedEmail) {
          console.log('Sending SSE notification for email:', decodedEmail);
          const sseData = `data: ${JSON.stringify({
            type: 'emailVerified',
            success: true,
            user: event.userData.user,
            access: event.userData.access,
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

    // Set maximum connection time (1 hour)
    const MAX_CONNECTION_TIME = 60 * 60 * 1000; // 1 hour
    const connectionTimeout = setTimeout(() => {
      console.log(`SSE connection timeout for email: ${decodedEmail}`);
      clearInterval(heartbeat);
      subscription.unsubscribe();
      res.end();
    }, MAX_CONNECTION_TIME);

    // Clear heartbeat and timeout when connection is closed
    res.on('close', () => {
      clearInterval(heartbeat);
      clearTimeout(connectionTimeout);
    });
  }
}
