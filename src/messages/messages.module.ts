import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { UploadService } from '../upload/upload.service';
import { MessagesService } from './messages.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MessagesController],
  providers: [MessagesGateway, MessagesService, PrismaService, UploadService],
  exports: [MessagesGateway],
})
export class MessagesModule {}
