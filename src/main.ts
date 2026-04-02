import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin with service account from environment
async function bootstrap() {
  // Check if FIREBASE_SERVICE_ACCOUNT env var exists
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccount) {
    try {
      const serviceAccountJson = JSON.parse(serviceAccount);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJson),
      });
      console.log('Firebase Admin initialized with service account');
    } catch (e) {
      console.error('Failed to initialize Firebase Admin:', e);
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT not set - Google Auth will not work');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: '*',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Serve static files (including chat images) with logging
  app.use('/uploads', express.static(join(process.cwd(), 'uploads'), {
    setHeaders: (res, path) => {
      console.log('Serving static file:', path);
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  }));
  console.log('Static files will be served from:', join(process.cwd(), 'uploads'));

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`Server running on http://0.0.0.0:${port}`);
  console.log('Socket.io will be initialized via NestJS Gateway');
}
bootstrap();
