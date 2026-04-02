import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { UploadService } from '../upload/upload.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 10 * 1024 * 1024, // 10 MB limit for image payloads
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private messagesService: MessagesService,
    private jwtService: JwtService,
    private uploadService: UploadService,
  ) {}

  async handleConnection(client: any) {
    try {
      console.log('Connection attempt from:', client.handshake.address);
      console.log('Auth data:', client.handshake.auth);

      const token = client.handshake.auth.token;
      if (!token) {
        console.log('No token provided, disconnecting');
        client.disconnect();
        return;
      }

      const decoded: any = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });

      console.log('Decoded token:', decoded);
      client.userId = decoded.sub || decoded.userId;
      
      // Join a individual room for the user to receive global notifications
      if (client.userId) {
        client.join(`user_${client.userId}`);
        console.log(`✅ User ${client.userId} joined their personal room: user_${client.userId}`);
      }
      
      console.log(`✅ User connected: ${client.userId}`);
    } catch (error) {
      console.error('❌ Authentication error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: any) {
    console.log(`User disconnected: ${client.userId}`);
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: any,
    @MessageBody() conversationId: string,
  ) {
    const room = `conversation_${conversationId}`;
    client.join(room);
    console.log(`User ${client.userId} joined room: ${room}`);
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: any,
    @MessageBody() conversationId: string,
  ) {
    const room = `conversation_${conversationId}`;
    client.leave(room);
    console.log(`User ${client.userId} left room: ${room}`);
  }

  @SubscribeMessage('create_conversation')
  async handleCreateConversation(
    @ConnectedSocket() client: any,
    @MessageBody() data: {
      listingId: number;
      sellerId: number;
      buyerId?: number;
      listingTitle?: string;
      listingPrice?: number;
      listingImages?: string[];
    },
  ) {
    try {
      const { listingId, sellerId, listingTitle, listingPrice, listingImages } = data;
      const buyerId = data.buyerId || client.userId;
      const senderId = client.userId;

      console.log(`Creating conversation for listing ${listingId}...`);

      if (!senderId) {
        client.emit('error', { message: 'Not authenticated' });
        return { success: false, message: 'Not authenticated' };
      }

      const conversation = await this.messagesService.createOrGetConversation(
        listingId,
        sellerId,
        buyerId,
        listingTitle,
        listingPrice,
        listingImages,
      );

      // Join the conversation room
      const room = `conversation_${conversation.conversationId}`;
      client.join(room);

      console.log(`Conversation created/found: ${conversation.id}`);

      return { success: true, conversation };
    } catch (error) {
      console.error('Error creating conversation:', error);
      client.emit('error', { message: 'Failed to create conversation' });
      return { success: false, message: 'Failed to create conversation' };
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: any,
    @MessageBody() data: { conversationId: string; text: string; listingId?: number; imageBase64?: string; imageUrl?: string },
  ) {
    try {
      const { conversationId, text, listingId, imageBase64, imageUrl } = data;
      const senderId = client.userId;

      console.log(`Received message from user ${senderId}:`, { conversationId, text, hasImageBase64: !!imageBase64, hasImageUrl: !!imageUrl });

      if (!senderId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Get conversation
      const conversation = await this.messagesService.prisma.conversation.findUnique({
        where: { conversationId },
      });

      if (!conversation) {
        console.log('Conversation not found');
        client.emit('error', { message: 'Conversation not found' });
        return;
      }

      let imagePath: string | undefined;
      // If an image is included, store it on the server
      if (imageBase64) {
        try {
          imagePath = await this.uploadService.storeImage(imageBase64);
        } catch (e) {
          console.error('Image upload failed:', e);
          client.emit('error', { message: 'Image upload failed' });
          return;
        }
      }
      // Create message (include imagePath if present)
      const message = await this.messagesService.createMessage(
        conversation.id,
        senderId,
        text,
        listingId,
        imagePath,
      );

      const lastMessageText = text.trim() ? text : (imagePath ? 'Image' : '');
      await this.messagesService.updateLastMessage(conversation.id, message.id, lastMessageText);
      await this.messagesService.incrementUnreadCount(conversation.id, senderId);

      // Get sender info
      const sender = await this.messagesService.prisma.user.findUnique({
        where: { id: senderId },
        select: { id: true, name: true, email: true, photoUrl: true },
      });

      const messagePayload = {
        id: message.id.toString(),
        conversationId: conversation.conversationId,
        senderId: message.senderId.toString(),
        receiverId: message.receiverId.toString(),
        text: message.text,
        timestamp: message.timestamp.toISOString(),
        isRead: message.isRead,
        sender,
        ...(imagePath && { imageUrl: `/${imagePath}` }), // Full path like /images/chats/uuid.png
      };

      // Emit to conversation room and receiver's personal room
      const room = `conversation_${conversationId}`;
      const receiverRoom = `user_${message.receiverId}`;
      
      console.log('Broadcasting message to rooms:', room, receiverRoom);
      this.server.to(room).to(receiverRoom).emit('new_message', messagePayload);
      
      console.log('Message sent with imagePath:', !!imagePath);

      client.emit('message_sent', messagePayload);
    } catch (error) {
      console.error('Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }
}
