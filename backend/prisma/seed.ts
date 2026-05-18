import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "compliance@finguard.ai" },
    update: {},
    create: {
      email: "compliance@finguard.ai",
      name: "FinGuard Admin",
      role: "admin",
      passwordHash,
    },
  });

  const account = await prisma.account.upsert({
    where: { accountNumber: "IE29-FING-0001" },
    update: {},
    create: {
      userId: user.id,
      accountNumber: "IE29-FING-0001",
      balance: 4820.75,
      currency: "EUR",
      status: "active",
    },
  });

  await prisma.transaction.upsert({
    where: { id: "txn_001" },
    update: {},
    create: {
      id: "txn_001",
      accountId: account.id,
      amount: 48.75,
      currency: "EUR",
      status: "review",
      description: "Refund request for duplicate charge",
    },
  });

  await prisma.transaction.upsert({
    where: { id: "txn_002" },
    update: {},
    create: {
      id: "txn_002",
      accountId: account.id,
      amount: 12.5,
      currency: "EUR",
      status: "completed",
      description: "Merchant settlement",
    },
  });

  await prisma.transaction.upsert({
    where: { id: "txn_003" },
    update: {},
    create: {
      id: "txn_003",
      accountId: account.id,
      amount: 734.2,
      currency: "EUR",
      status: "pending",
      description: "Cross-border wallet transfer",
    },
  });

  await prisma.dispute.upsert({
    where: { id: "disp_001" },
    update: {},
    create: {
      id: "disp_001",
      transactionId: "txn_001",
      reason: "Duplicate payment",
      status: "open",
      notes: "Customer reports duplicate card charge.",
    },
  });

  await prisma.dispute.upsert({
    where: { id: "disp_002" },
    update: {},
    create: {
      id: "disp_002",
      transactionId: "txn_003",
      reason: "Unusual transfer pattern",
      status: "escalated",
      notes: "Large transfer flagged for manual review.",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
