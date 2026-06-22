import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  roleId: z.string(),
  subsidiaryIds: z.array(z.string()).min(1),
  department: z.string().optional(),
});

export const createSaleSchema = z.object({
  amount: z.number().positive(),
  date: z.string(),
  branchId: z.string(),
  notes: z.string().optional(),
});

export const createExpenseSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  date: z.string(),
  description: z.string().optional(),
  branchId: z.string(),
});

export const createInventoryItemSchema = z.object({
  productName: z.string().min(1),
  category: z.string().min(1),
  quantity: z.number().int().min(0),
  costPrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  branchId: z.string(),
  reorderLevel: z.number().int().min(0).default(10),
});

export const inventoryMovementSchema = z.object({
  itemId: z.string(),
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
  staffId: z.string().optional(),
});

export const createVendorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  goodsSupplied: z.string().optional(),
  address: z.string().optional(),
});

export const createVendorInvoiceSchema = z.object({
  amount: z.number().positive(),
  deliveryDate: z.string(),
  description: z.string().optional(),
});

export const vendorPaymentSchema = z.object({
  amount: z.number().positive(),
  date: z.string(),
  notes: z.string().optional(),
});

export const createAssetSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  value: z.number().min(0),
  branchId: z.string(),
  status: z.enum(['active', 'maintenance', 'retired']).default('active'),
  description: z.string().optional(),
});

export const checkInSchema = z.object({
  method: z.enum(['mobile', 'qr', 'manual']).default('mobile'),
  branchId: z.string().optional(),
});

export const createAccountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
});

export const journalEntrySchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  reference: z.string().optional(),
  lines: z.array(z.object({
    accountId: z.string(),
    debit: z.number().min(0).default(0),
    credit: z.number().min(0).default(0),
    description: z.string().optional(),
  })).min(2),
});

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const createCustomerInvoiceSchema = z.object({
  customerId: z.string(),
  amount: z.number().positive(),
  dueDate: z.string(),
  description: z.string().optional(),
});

export const createGuestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  idNumber: z.string().optional(),
  address: z.string().optional(),
});

export const createRoomSchema = z.object({
  number: z.string().min(1),
  type: z.enum(['standard', 'deluxe', 'suite']).default('standard'),
  rate: z.number().positive(),
  capacity: z.number().int().min(1).default(2),
  beds: z.number().int().min(1).default(1),
  propertyId: z.string(),
  amenities: z.string().optional(),
});

export const createBookingSchema = z.object({
  guestId: z.string(),
  roomId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  totalAmount: z.number().positive(),
  notes: z.string().optional(),
});

export const bookingPaymentSchema = z.object({
  amount: z.number().positive(),
  date: z.string(),
  method: z.string().optional(),
  receiptNo: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;
export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
