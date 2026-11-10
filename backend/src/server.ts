import app from './app';
import { env } from './config/env';
import prisma from './shared/database/prisma';

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
      console.log(`📍 Env: ${env.NODE_ENV}`);
      console.log(`🌐 API: http://localhost:${env.PORT}/api/v1`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

