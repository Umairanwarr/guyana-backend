import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadService {
  private readonly uploadDir = join(process.cwd(), 'uploads', 'chats');

  async storeImage(base64: string): Promise<string> {
    // Extract mime type and data
    let mime = 'image/png';
    let data = base64;
    const matches = base64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (matches) {
      mime = matches[1];
      data = matches[2];
    }
    const ext = mime.split('/')[1];
    const filename = `${uuidv4()}.${ext}`;
    const filePath = join(this.uploadDir, filename);
    // Ensure directory exists
    await fs.mkdir(this.uploadDir, { recursive: true });
    // Write file
    console.log('Saving image to', filePath);
    await fs.writeFile(filePath, Buffer.from(data, 'base64'));
    console.log('Image saved');
    // Return relative path used in DB
    return `uploads/chats/${filename}`;
  }
}
