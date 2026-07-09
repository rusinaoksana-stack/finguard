import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "Password123";

const customerSeeds = [
  { name: "Emma Murphy", email: "customer.demo@finguard.ai", accountNumber: "IE29-FING-1001", balance: 2450.25, transactionCount: 9 },
  { name: "Liam Kelly", email: "liam.kelly@finguard.ai", accountNumber: "IE29-FING-1002", balance: 3810.4, transactionCount: 2 },
  { name: "Jack Byrne", email: "jack.byrne@finguard.ai", accountNumber: "IE29-FING-1003", balance: 1290.0, transactionCount: 3 },
  { name: "Emily Walsh", email: "emily.walsh@finguard.ai", accountNumber: "IE29-FING-1004", balance: 4985.9, transactionCount: 4 },
  { name: "Daniel Ryan", email: "daniel.ryan@finguard.ai", accountNumber: "IE29-FING-1005", balance: 870.55, transactionCount: 5 },
  { name: "Grace O'Brien", email: "grace.obrien@finguard.ai", accountNumber: "IE29-FING-1006", balance: 6420.1, transactionCount: 6 },
  { name: "Adam Doyle", email: "adam.doyle@finguard.ai", accountNumber: "IE29-FING-1007", balance: 3115.7, transactionCount: 7 },
  { name: "Sarah O'Connor", email: "sarah.oconnor@finguard.ai", accountNumber: "IE29-FING-1008", balance: 9050.0, transactionCount: 8 },
  { name: "James McCarthy", email: "james.mccarthy@finguard.ai", accountNumber: "IE29-FING-1009", balance: 1575.2, transactionCount: 9 },
  { name: "Chloe Nolan", email: "chloe.nolan@finguard.ai", accountNumber: "IE29-FING-1010", balance: 7205.45, transactionCount: 10 },
  { name: "Michael Gallagher", email: "michael.gallagher@finguard.ai", accountNumber: "IE29-FING-1011", balance: 540.8, transactionCount: 1 },
  { name: "Ella Brennan", email: "ella.brennan@finguard.ai", accountNumber: "IE29-FING-1012", balance: 2240.0, transactionCount: 3 },
  { name: "Luke Hayes", email: "luke.hayes@finguard.ai", accountNumber: "IE29-FING-1013", balance: 6890.3, transactionCount: 5 },
  { name: "Sophie Kennedy", email: "sophie.kennedy@finguard.ai", accountNumber: "IE29-FING-1014", balance: 4125.65, transactionCount: 7 },
  { name: "Ryan Fitzgerald", email: "ryan.fitzgerald@finguard.ai", accountNumber: "IE29-FING-1015", balance: 3380.9, transactionCount: 9 },
];

const legacySeedEmails = [
  "andriy.kovalenko@finguard.ai",
  "marta.shevchenko@finguard.ai",
  "taras.bondarenko@finguard.ai",
  "iryna.hrytsenko@finguard.ai",
  "dmytro.savchuk@finguard.ai",
  "natalia.moroz@finguard.ai",
  "bohdan.lysenko@finguard.ai",
  "olena.tkachenko@finguard.ai",
  "roman.petrenko@finguard.ai",
  "sofia.kravets@finguard.ai",
  "mykhailo.polishchuk@finguard.ai",
  "kateryna.oliinyk@finguard.ai",
  "viktor.marchenko@finguard.ai",
  "anastasiia.rudenko@finguard.ai",
  "liam.obrien@finguard.ai",
  "niamh.walsh@finguard.ai",
  "conor.byrne@finguard.ai",
  "saoirse.kelly@finguard.ai",
  "cian.gallagher@finguard.ai",
  "orla.fitzgerald@finguard.ai",
  "sean.doyle@finguard.ai",
  "ciara.nolan@finguard.ai",
  "patrick.ryan@finguard.ai",
  "maeve.oconnor@finguard.ai",
  "finn.mccarthy@finguard.ai",
  "aisling.brennan@finguard.ai",
  "eoin.hayes@finguard.ai",
  "roisin.kennedy@finguard.ai",
];

const transactionTemplates = [
  { amount: 48.75, status: "review", description: "Duplicate card charge reported" },
  { amount: 12.5, status: "completed", description: "Merchant settlement" },
  { amount: 734.2, status: "pending", description: "Cross-border wallet transfer" },
  { amount: 96.4, status: "completed", description: "Online grocery purchase" },
  { amount: 129.99, status: "review", description: "Unusual device payment" },
  { amount: 18.2, status: "completed", description: "Subscription renewal" },
  { amount: 420.0, status: "pending", description: "Incoming bank transfer" },
  { amount: 67.35, status: "completed", description: "Fuel station payment" },
  { amount: 250.0, status: "review", description: "High-risk merchant transaction" },
  { amount: 31.8, status: "completed", description: "Public transport top-up" },
] as const;

async function seedAdmin(passwordHash: string) {
  await prisma.user.upsert({
    where: { email: "auditor@finguard.ai" },
    update: {
      name: "FinGuard Auditor",
      role: "admin",
      passwordHash,
    },
    create: {
      email: "auditor@finguard.ai",
      name: "FinGuard Auditor",
      role: "admin",
      passwordHash,
    },
  });
}

async function seedCustomer(
  customer: (typeof customerSeeds)[number],
  index: number,
  passwordHash: string,
) {
  const user = await prisma.user.upsert({
    where: { email: customer.email },
    update: {
      name: customer.name,
      role: "user",
      passwordHash,
    },
    create: {
      email: customer.email,
      name: customer.name,
      role: "user",
      passwordHash,
    },
  });

  const account = await prisma.account.upsert({
    where: { accountNumber: customer.accountNumber },
    update: {
      userId: user.id,
      balance: customer.balance,
      currency: "EUR",
      status: "active",
    },
    create: {
      userId: user.id,
      accountNumber: customer.accountNumber,
      balance: customer.balance,
      currency: "EUR",
      status: "active",
    },
  });

  for (let transactionIndex = 0; transactionIndex < customer.transactionCount; transactionIndex += 1) {
    const template = transactionTemplates[transactionIndex];
    const transactionId = `txn_seed_${String(index + 1).padStart(2, "0")}_${String(transactionIndex + 1).padStart(2, "0")}`;

    await prisma.transaction.upsert({
      where: { id: transactionId },
      update: {
        accountId: account.id,
        amount: template.amount + index * 3,
        currency: "EUR",
        status: template.status,
        description: template.description,
        createdAt: new Date(Date.UTC(2026, 5, 1 + index, 9 + transactionIndex, 0, 0)),
      },
      create: {
        id: transactionId,
        accountId: account.id,
        amount: template.amount + index * 3,
        currency: "EUR",
        status: template.status,
        description: template.description,
        createdAt: new Date(Date.UTC(2026, 5, 1 + index, 9 + transactionIndex, 0, 0)),
      },
    });

    if (template.status === "review") {
      await prisma.dispute.upsert({
        where: { id: `disp_seed_${transactionId}` },
        update: {
          transactionId,
          reason: template.description,
          status: transactionIndex % 2 === 0 ? "open" : "escalated",
          notes: "Seeded case for auditor transaction review.",
        },
        create: {
          id: `disp_seed_${transactionId}`,
          transactionId,
          reason: template.description,
          status: transactionIndex % 2 === 0 ? "open" : "escalated",
          notes: "Seeded case for auditor transaction review.",
        },
      });
    }
  }
}

async function removeEmptyCustomers() {
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { in: legacySeedEmails } },
        { role: "user" },
      ],
      accounts: { none: {} },
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await seedAdmin(passwordHash);

  for (const [index, customer] of customerSeeds.entries()) {
    await seedCustomer(customer, index, passwordHash);
  }

  await removeEmptyCustomers();
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
