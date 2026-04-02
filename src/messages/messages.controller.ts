import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

interface AuthRequest extends Request {
  user: { userId: number };
}

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  async getConversations(@Req() req: AuthRequest) {
    const userId = req.user.userId;
    return { conversations: await this.messagesService.getConversations(userId) };
  }

  @Get(':conversationId')
  async getMessages(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
  ) {
    const userId = req.user.userId;

    const conversation = await this.messagesService.prisma.conversation.findUnique({
      where: { conversationId },
    });

    if (!conversation) {
      return { messages: [] };
    }

    const messages = await this.messagesService.getMessages(conversation.id, userId);
    console.log(`🔔 Fetched messages count: ${messages.length}`);
    return { messages };
  }

  @Post(':conversationId/read')
  async markAsRead(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
  ) {
    const userId = req.user.userId;

    const conversation = await this.messagesService.prisma.conversation.findUnique({
      where: { conversationId },
    });

    if (!conversation) {
      return { success: false, message: 'Conversation not found' };
    }

    await this.messagesService.markAsRead(conversation.id, userId);
    return { success: true };
  }

  @Post('create-conversation')
  async createOrGetConversation(
    @Req() req: AuthRequest,
    @Body() data: {
      listingId: string | number;
      sellerId: string | number;
      buyerId: string | number;
      listingTitle?: string;
      listingPrice?: number;
      listingImages?: string[];
    },
  ) {
    const userId = req.user.userId;
    const conversation = await this.messagesService.createOrGetConversation(
      Number(data.listingId),
      Number(data.sellerId),
      Number(data.buyerId || userId),
      data.listingTitle,
      data.listingPrice,
      data.listingImages,
    );
    return { conversation };
  }
}
