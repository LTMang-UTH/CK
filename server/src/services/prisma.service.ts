import { PrismaClient } from '@prisma/client';

class PrismaService {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaClient();
    }
    return PrismaService.instance;
  }

  static async connect() {
    const prisma = PrismaService.getInstance();
    await prisma.$connect();
    console.log('✅ Database connected');
  }

  static async disconnect() {
    const prisma = PrismaService.getInstance();
    await prisma.$disconnect();
    console.log('❌ Database disconnected');
  }
}

export const prisma = PrismaService.getInstance();
export default PrismaService;

