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
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private adminClients: Set<Socket> = new Set();

  handleConnection(client: Socket) {
    const isAdmin = client.handshake.query.isAdmin === 'true';
    if (isAdmin) {
      this.adminClients.add(client);
    }
  }

  handleDisconnect(client: Socket) {
    this.adminClients.delete(client);
  }

  @SubscribeMessage('joinAdminRoom')
  handleJoinAdminRoom(client: Socket) {
    client.join('admin');
    this.adminClients.add(client);
  }

  sendNewReportNotification(notification: any) {
    this.server.to('admin').emit('newReportNotification', notification);
    this.adminClients.forEach((client) => {
      client.emit('newReportNotification', notification);
    });
  }
}