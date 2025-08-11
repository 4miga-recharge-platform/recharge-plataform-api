import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, Socket> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(client: Socket, payload: { userId: string }) {
    client.join(`user_${payload.userId}`);
    console.log(`User ${payload.userId} joined their room`);
  }

  // Method to notify when email is verified
  notifyEmailVerified(userId: string, userData: any) {
    this.server.to(`user_${userId}`).emit('emailVerified', {
      success: true,
      user: userData,
      timestamp: new Date().toISOString(),
    });
  }
}
