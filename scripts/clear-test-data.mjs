import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.message.deleteMany();
  const conversations = await prisma.conversation.deleteMany();
  const dmLogs = await prisma.dmLog.deleteMany();
  const contacts = await prisma.contact.deleteMany();
  const executions = await prisma.automationExecution.deleteMany();
  const webhooks = await prisma.webhookEvent.deleteMany();

  console.log(
    JSON.stringify({
      messages: messages.count,
      conversations: conversations.count,
      dmLogs: dmLogs.count,
      contacts: contacts.count,
      executions: executions.count,
      webhooks: webhooks.count,
    })
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
