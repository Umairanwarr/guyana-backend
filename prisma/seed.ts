import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'gycentral592@gmail.com';
  const password = 'Super123!';
  const name = 'Admin';

  const existingUser = await prisma.user.findUnique({ where: { email } });
  
  if (existingUser) {
    if (existingUser.isAdmin) {
      console.log('Admin user already exists and has admin privileges');
    } else {
      await prisma.user.update({
        where: { email },
        data: { isAdmin: true, isVerified: true },
      });
      console.log('Updated existing user to have admin privileges');
    }
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      isVerified: true,
      isAdmin: true,
    },
  });

  console.log('Admin user created:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
