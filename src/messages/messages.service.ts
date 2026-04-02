import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(public readonly prisma: PrismaService) {}

  async getConversations(userId: number) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ sellerId: userId }, { buyerId: userId }],
        listing: {
          status: 'active',
        },
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          },
        },
      },
      orderBy: {
        lastMessageTime: 'desc',
      },
    });

    return conversations.map((conv) => ({
      ...conv,
      unreadCount:
        conv.sellerId === userId ? conv.unreadCountSeller : conv.unreadCountBuyer,
    }));
  }

  async getMessages(conversationId: number, userId: number) {
    return this.prisma.message.findMany({
      where: {
        conversationId,
        conversation: {
          OR: [{ sellerId: userId }, { buyerId: userId }],
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  async createMessage(
    conversationId: number,
    senderId: number,
    text: string,
    listingId?: number,
    imagePath?: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const receiverId =
      conversation.sellerId === senderId
        ? conversation.buyerId
        : conversation.sellerId;

    return this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        receiverId,
        text,
        ...(imagePath && { imagePath }),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          },
        },
      },
    });
  }

  async createOrGetConversation(
    listingId: number,
    sellerId: number,
    buyerId: number,
    listingTitle?: string,
    listingPrice?: number,
    listingImages?: string[],
  ): Promise<any> {
    const conversationId =
      sellerId < buyerId 
        ? `${sellerId}_${buyerId}_${listingId}` 
        : `${buyerId}_${sellerId}_${listingId}`;

    let conversation = await this.prisma.conversation.findUnique({
      where: { conversationId },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          conversationId,
          listingId,
          sellerId: Number(sellerId),
          buyerId: Number(buyerId),
          listingTitle,
          listingPrice,
          listingImages: listingImages ? JSON.stringify(listingImages) : null,
        },
      });
    }

    // Return conversation with seller/buyer info included
    return this.prisma.conversation.findUnique({
      where: { conversationId },
      include: {
        seller: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
        buyer: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
      },
    });
  }

  async markAsRead(conversationId: number, userId: number) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const otherUserId =
      conversation.sellerId === userId ? conversation.buyerId : conversation.sellerId;

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(conversation.sellerId === userId
          ? { unreadCountSeller: 0 }
          : { unreadCountBuyer: 0 }),
      },
    });
  }

  async incrementUnreadCount(conversationId: number, senderId: number) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) return;

    const isSeller = senderId === conversation.sellerId;

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(isSeller
          ? { unreadCountBuyer: { increment: 1 } }
          : { unreadCountSeller: { increment: 1 } }),
      },
    });
  }

  async updateLastMessage(
    conversationId: number,
    messageId: number,
    text: string,
  ) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: text,
        lastMessageTime: new Date(),
      },
    });
  }
}
