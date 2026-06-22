import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  ROLES,
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  SUBSIDIARIES,
  SUBSIDIARY_LABELS,
} from '@agbms/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const subsidiaries = await Promise.all(
    Object.entries(SUBSIDIARIES).map(async ([, slug]) => {
      return prisma.subsidiary.upsert({
        where: { slug },
        update: { isActive: true },
        create: {
          slug,
          name: SUBSIDIARY_LABELS[slug],
          description: `${SUBSIDIARY_LABELS[slug]} - Atlantic Group subsidiary`,
          isActive: true,
        },
      });
    })
  );

  const foodCenter = subsidiaries.find((s) => s.slug === SUBSIDIARIES.FOOD_CENTER)!;
  const station = subsidiaries.find((s) => s.slug === SUBSIDIARIES.STATION)!;
  const airbnb = subsidiaries.find((s) => s.slug === SUBSIDIARIES.AIRBNB)!;

  const branch = await prisma.branch.upsert({
    where: { id: 'main-branch-fc' },
    update: {},
    create: {
      id: 'main-branch-fc',
      name: 'Main Branch',
      address: '123 Atlantic Avenue',
      subsidiaryId: foodCenter.id,
    },
  });

  const roles = await Promise.all(
    Object.entries(ROLES).map(async ([, slug]) => {
      return prisma.role.upsert({
        where: { slug },
        update: { permissions: JSON.stringify(ROLE_PERMISSIONS[slug]) },
        create: {
          slug,
          name: ROLE_LABELS[slug],
          permissions: JSON.stringify(ROLE_PERMISSIONS[slug]),
        },
      });
    })
  );

  const roleMap = Object.fromEntries(roles.map((r) => [r.slug, r]));

  const defaultPassword = await bcrypt.hash('password123', 12);

  const users = [
    { name: 'Super Admin', email: 'admin@atlanticgroup.com', role: ROLES.SUPER_ADMIN, subsidiaries: subsidiaries.map((s) => s.id) },
    { name: 'Food Center Admin', email: 'fcadmin@atlanticgroup.com', role: ROLES.ADMIN, subsidiaries: [foodCenter.id] },
    { name: 'John Manager', email: 'manager@atlanticgroup.com', role: ROLES.MANAGER, subsidiaries: [foodCenter.id] },
    { name: 'Sarah Sales', email: 'sales@atlanticgroup.com', role: ROLES.SALES_AGENT, subsidiaries: [foodCenter.id] },
    { name: 'Mike Accountant', email: 'accountant@atlanticgroup.com', role: ROLES.ACCOUNTANT, subsidiaries: [foodCenter.id] },
    { name: 'Lisa Inventory', email: 'inventory@atlanticgroup.com', role: ROLES.INVENTORY_OFFICER, subsidiaries: [foodCenter.id] },
    { name: 'Tom Security', email: 'security@atlanticgroup.com', role: ROLES.SECURITY, subsidiaries: [foodCenter.id] },
    { name: 'Anna Accountant', email: 'station@atlanticgroup.com', role: ROLES.ACCOUNTANT, subsidiaries: [station.id] },
    { name: 'Grace Guest Manager', email: 'guest@atlanticgroup.com', role: ROLES.GUEST_MANAGER, subsidiaries: [airbnb.id] },
    { name: 'Rita Receptionist', email: 'receptionist@atlanticgroup.com', role: ROLES.RECEPTIONIST, subsidiaries: [airbnb.id] },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password: defaultPassword,
        roleId: roleMap[u.role].id,
        qrCode: uuidv4(),
        staffProfile: {
          create: {
            department: u.role === ROLES.SALES_AGENT ? 'Sales' : u.role === ROLES.INVENTORY_OFFICER ? 'Inventory' : 'Management',
            hireDate: new Date('2024-01-15'),
          },
        },
      },
    });

    for (const subId of u.subsidiaries) {
      await prisma.userSubsidiary.upsert({
        where: { userId_subsidiaryId: { userId: user.id, subsidiaryId: subId } },
        update: {},
        create: { userId: user.id, subsidiaryId: subId },
      });
    }
  }

  const inventoryItems = [
    { productName: 'Rice 25kg', category: 'Grains', quantity: 50, costPrice: 35, sellingPrice: 45, reorderLevel: 10 },
    { productName: 'Cooking Oil 5L', category: 'Oils', quantity: 30, costPrice: 12, sellingPrice: 18, reorderLevel: 8 },
    { productName: 'Tomato Paste', category: 'Canned Goods', quantity: 5, costPrice: 2.5, sellingPrice: 4, reorderLevel: 15 },
    { productName: 'Chicken Breast', category: 'Meat', quantity: 20, costPrice: 8, sellingPrice: 12, reorderLevel: 10 },
    { productName: 'Fresh Vegetables Mix', category: 'Produce', quantity: 15, costPrice: 5, sellingPrice: 8, reorderLevel: 5 },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.create({
      data: { ...item, branchId: branch.id },
    });
  }

  const vendor = await prisma.vendor.create({
    data: {
      name: 'Fresh Foods Supplier',
      email: 'orders@freshfoods.com',
      phone: '+1-555-0100',
      goodsSupplied: 'Produce, Grains, Oils',
      address: '456 Supplier Lane',
      subsidiaryId: foodCenter.id,
    },
  });

  await prisma.vendorInvoice.create({
    data: {
      vendorId: vendor.id,
      amount: 1500,
      paidAmount: 1000,
      status: 'partial',
      deliveryDate: new Date(),
      description: 'Monthly supply order',
    },
  });

  const salesAgent = await prisma.user.findUnique({ where: { email: 'sales@atlanticgroup.com' } });
  if (salesAgent) {
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      await prisma.sale.create({
        data: {
          staffId: salesAgent.id,
          amount: 1200 + Math.random() * 800,
          date,
          branchId: branch.id,
          status: i < 5 ? 'approved' : 'pending',
        },
      });
    }
  }

  await prisma.expense.createMany({
    data: [
      { category: 'Utilities', amount: 350, date: new Date(), enteredById: (await prisma.user.findUnique({ where: { email: 'accountant@atlanticgroup.com' } }))!.id, branchId: branch.id },
      { category: 'Rent', amount: 2000, date: new Date(), enteredById: (await prisma.user.findUnique({ where: { email: 'accountant@atlanticgroup.com' } }))!.id, branchId: branch.id },
      { category: 'Supplies', amount: 150, date: new Date(), enteredById: (await prisma.user.findUnique({ where: { email: 'manager@atlanticgroup.com' } }))!.id, branchId: branch.id },
    ],
  });

  await prisma.asset.createMany({
    data: [
      { name: 'Commercial Refrigerator', category: 'Equipment', value: 5000, branchId: branch.id, subsidiaryId: foodCenter.id },
      { name: 'POS Terminal', category: 'Electronics', value: 800, branchId: branch.id, subsidiaryId: foodCenter.id },
      { name: 'Delivery Van', category: 'Vehicle', value: 25000, branchId: branch.id, subsidiaryId: foodCenter.id },
    ],
  });

  // Atlantic Station — Chart of Accounts & sample data
  const stationBranch = await prisma.branch.upsert({
    where: { id: 'main-branch-station' },
    update: {},
    create: { id: 'main-branch-station', name: 'Station HQ', address: '789 Commerce Blvd', subsidiaryId: station.id },
  });

  const coa = [
    { code: '1000', name: 'Cash', type: 'asset', balance: 25000 },
    { code: '1100', name: 'Accounts Receivable', type: 'asset', balance: 8500 },
    { code: '1500', name: 'Equipment', type: 'asset', balance: 45000 },
    { code: '2000', name: 'Accounts Payable', type: 'liability', balance: 5200 },
    { code: '2100', name: 'Bank Loan', type: 'liability', balance: 30000 },
    { code: '3000', name: 'Owner Equity', type: 'equity', balance: 43300 },
    { code: '4000', name: 'Service Revenue', type: 'revenue', balance: 85000 },
    { code: '4100', name: 'Product Sales', type: 'revenue', balance: 32000 },
    { code: '5000', name: 'Salaries Expense', type: 'expense', balance: 28000 },
    { code: '5100', name: 'Rent Expense', type: 'expense', balance: 12000 },
    { code: '5200', name: 'Utilities Expense', type: 'expense', balance: 4200 },
  ];

  for (const acct of coa) {
    await prisma.account.upsert({
      where: { code_subsidiaryId: { code: acct.code, subsidiaryId: station.id } },
      update: { balance: acct.balance },
      create: { ...acct, subsidiaryId: station.id },
    });
  }

  await prisma.bankAccount.upsert({
    where: { id: 'bank-station-main' },
    update: {},
    create: { id: 'bank-station-main', name: 'Atlantic Station Main Account', accountNumber: '****4521', balance: 25000, subsidiaryId: station.id },
  });

  const customer = await prisma.customer.create({
    data: { name: 'Metro Retail Corp', email: 'billing@metroretail.com', phone: '+1-555-0200', subsidiaryId: station.id },
  });

  await prisma.customerInvoice.create({
    data: {
      customerId: customer.id,
      amount: 5000,
      paidAmount: 3000,
      status: 'partial',
      dueDate: new Date(Date.now() + 30 * 86400000),
      description: 'Consulting services Q1',
      subsidiaryId: station.id,
    },
  });

  // Atlantic Air BNB — Property, rooms, guests, bookings
  const property = await prisma.property.upsert({
    where: { id: 'property-airbnb-main' },
    update: {},
    create: { id: 'property-airbnb-main', name: 'Atlantic Suites', address: '101 Ocean View Drive', subsidiaryId: airbnb.id },
  });

  const roomData = [
    { number: '101', type: 'standard', rate: 89, status: 'occupied' },
    { number: '102', type: 'standard', rate: 89, status: 'available' },
    { number: '103', type: 'deluxe', rate: 129, status: 'occupied' },
    { number: '201', type: 'deluxe', rate: 129, status: 'available' },
    { number: '202', type: 'suite', rate: 199, status: 'cleaning' },
    { number: '203', type: 'suite', rate: 199, status: 'available' },
    { number: '301', type: 'standard', rate: 89, status: 'occupied' },
    { number: '302', type: 'deluxe', rate: 129, status: 'maintenance' },
  ];

  const rooms = [];
  for (const r of roomData) {
    const room = await prisma.room.upsert({
      where: { number_propertyId: { number: r.number, propertyId: property.id } },
      update: { status: r.status },
      create: { ...r, propertyId: property.id, capacity: r.type === 'suite' ? 4 : 2, beds: r.type === 'suite' ? 2 : 1 },
    });
    rooms.push(room);
  }

  for (const room of rooms.slice(0, 3)) {
    await prisma.roomInventory.createMany({
      data: [
        { roomId: room.id, itemName: 'Queen Bed', category: 'furniture', quantity: 1 },
        { roomId: room.id, itemName: 'Smart TV', category: 'electronics', quantity: 1 },
        { roomId: room.id, itemName: 'Toiletries Set', category: 'toiletries', quantity: 2 },
      ],
    });
  }

  const guests = await Promise.all([
    prisma.guest.create({ data: { name: 'James Wilson', email: 'james@email.com', phone: '+1-555-0301' } }),
    prisma.guest.create({ data: { name: 'Maria Garcia', email: 'maria@email.com', phone: '+1-555-0302' } }),
    prisma.guest.create({ data: { name: 'David Chen', email: 'david@email.com', phone: '+1-555-0303' } }),
  ]);

  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 5);

  await prisma.booking.create({
    data: {
      guestId: guests[0].id, roomId: rooms[0].id,
      checkIn: today, checkOut: nextWeek, status: 'checked_in',
      totalAmount: 445, paidAmount: 445,
    },
  });
  await prisma.booking.create({
    data: {
      guestId: guests[1].id, roomId: rooms[2].id,
      checkIn: today, checkOut: tomorrow, status: 'checked_in',
      totalAmount: 129, paidAmount: 100,
    },
  });
  await prisma.booking.create({
    data: {
      guestId: guests[2].id, roomId: rooms[6].id,
      checkIn: today, checkOut: nextWeek, status: 'reserved',
      totalAmount: 445, paidAmount: 200,
    },
  });

  await prisma.housekeepingTask.create({
    data: { roomId: rooms[4].id, status: 'pending', scheduledDate: today, notes: 'Post-checkout deep clean' },
  });

  console.log('Seed completed!');
  console.log('Default password for all users: password123');
  console.log('New accounts: station@atlanticgroup.com, guest@atlanticgroup.com, receptionist@atlanticgroup.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
