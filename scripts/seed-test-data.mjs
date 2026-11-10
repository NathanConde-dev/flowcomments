#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding test data...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@test.com',
      password: hashedPassword,
      isAdmin: true,
    },
  });
  console.log('✓ Admin user created:', admin.username);

  // Create fake Instagram account
  const igAccount = await prisma.instagramAccount.upsert({
    where: { igUserId: 'fake_ig_123456' },
    update: {},
    create: {
      userId: admin.id,
      igUsername: 'flowcomments_demo',
      igUserId: 'fake_ig_123456',
      accessToken: 'fake_token',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      isActive: true,
      lastSyncAt: new Date(),
    },
  });
  console.log('✓ Instagram account created:', igAccount.igUsername);

  // Create some fake contacts
  for (let i = 1; i <= 5; i++) {
    await prisma.contact.upsert({
      where: { igUserId_instagramAccountId: { igUserId: `user_${i}`, instagramAccountId: igAccount.id } },
      update: {},
      create: {
        userId: admin.id,
        instagramAccountId: igAccount.id,
        igUsername: `user_${i}`,
        igUserId: `user_${i}`,
        fullName: `Test User ${i}`,
      },
    });
  }
  console.log('✓ 5 contacts created');

  // Create sample automation
  await prisma.automation.upsert({
    where: { id: 'sample_automation' },
    update: {},
    create: {
      id: 'sample_automation',
      userId: admin.id,
      instagramAccountId: igAccount.id,
      name: 'Resposta Automática',
      trigger: 'comment_keyword',
      triggerConfig: { keywords: ['oi', 'olá'] },
      action: 'send_dm',
      actionConfig: { message: 'Olá! Como posso ajudar?' },
      isActive: true,
    },
  });
  console.log('✓ Sample automation created');

  console.log('✅ Seed complete!');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
