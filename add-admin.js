const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'gycentral592@gmail.com';
  const password = 'Super123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('User already exists, updating to admin...');
    await prisma.user.update({
      where: { email },
      data: { 
        isAdmin: true,
        password: hashedPassword,
        isVerified: true 
      }
    });
    console.log('Admin user updated:', email);
  } else {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        isAdmin: true,
        isVerified: true,
        name: 'Admin User'
      }
    });
    console.log('Admin user created:', user.email);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
