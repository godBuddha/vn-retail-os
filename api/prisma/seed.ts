import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();


async function upsertInventory(branchId: string, productId: string) {
  const existing = await prisma.inventory.findFirst({ where: { branchId, productId } });
  if (!existing) {
    await prisma.inventory.create({
      data: { branchId, productId, quantity: Math.floor(Math.random() * 100) + 20 },
    });
  }
}

async function main() {
  console.log('🌱 Seeding database...');

  // Branch
  const branch = await prisma.branch.upsert({
    where: { code: 'CN001' },
    update: {},
    create: {
      code: 'CN001', name: 'Chi Nhánh Trung Tâm',
      address: '123 Nguyễn Huệ, Quận 1', city: 'TP. Hồ Chí Minh',
      phone: '028-1234-5678', email: 'chinhanh1@retail.vn',
      isDefault: true, openTime: '08:00', closeTime: '22:00',
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { code: 'CN002' },
    update: {},
    create: {
      code: 'CN002', name: 'Chi Nhánh Quận 7',
      address: '456 Nguyễn Thị Thập, Quận 7', city: 'TP. Hồ Chí Minh',
      phone: '028-9876-5432', email: 'chinhanh2@retail.vn',
      openTime: '08:00', closeTime: '21:00',
    },
  });
  console.log('✅ Branches created');

  // Admin
  const hashedPass = await bcrypt.hash('Admin@2024', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@retail.vn' },
    update: {},
    create: {
      email: 'admin@retail.vn', firstName: 'Quản Trị', lastName: 'Viên',
      password: hashedPass, role: Role.SUPER_ADMIN, isActive: true, isEmailVerified: true,
      userBranches: { create: [
        { branchId: branch.id, isPrimary: true },
        { branchId: branch2.id, isPrimary: false },
      ]},
    },
  });

  const cashierPass = await bcrypt.hash('Cashier@2024', 12);
  await prisma.user.upsert({
    where: { email: 'thu_ngan@retail.vn' },
    update: {},
    create: {
      email: 'thu_ngan@retail.vn', firstName: 'Nguyễn', lastName: 'Thu Ngân',
      password: cashierPass, role: Role.CASHIER, isActive: true,
      userBranches: { create: { branchId: branch.id, isPrimary: true } },
    },
  });

  const managerPass = await bcrypt.hash('Manager@2024', 12);
  await prisma.user.upsert({
    where: { email: 'quan_ly@retail.vn' },
    update: {},
    create: {
      email: 'quan_ly@retail.vn', firstName: 'Trần', lastName: 'Quản Lý',
      password: managerPass, role: Role.MANAGER, isActive: true,
      userBranches: { create: { branchId: branch.id, isPrimary: true } },
    },
  });
  console.log('✅ Users created: admin@retail.vn / Admin@2024');

  // Units
  const unitData = [
    { id: 'unit-cai', name: 'Cái', nameEn: 'Piece', symbol: 'pcs' },
    { id: 'unit-hop', name: 'Hộp', nameEn: 'Box', symbol: 'box' },
    { id: 'unit-kg', name: 'Kg', nameEn: 'Kilogram', symbol: 'kg' },
    { id: 'unit-lit', name: 'Lít', nameEn: 'Liter', symbol: 'l' },
    { id: 'unit-goi', name: 'Gói', nameEn: 'Pack', symbol: 'pack' },
    { id: 'unit-binh', name: 'Bình', nameEn: 'Bottle', symbol: 'btl' },
    { id: 'unit-thung', name: 'Thùng', nameEn: 'Carton', symbol: 'ctn' },
  ];
  for (const u of unitData) {
    await prisma.unit.upsert({ where: { id: u.id }, update: {}, create: u });
  }
  console.log('✅ Units created');

  // Categories
  const catDoUong = await prisma.category.upsert({
    where: { code: 'CAT001' }, update: {},
    create: { code: 'CAT001', name: 'Đồ Uống', nameEn: 'Beverages', slug: 'do-uong', sortOrder: 1 },
  });
  const catThucPham = await prisma.category.upsert({
    where: { code: 'CAT002' }, update: {},
    create: { code: 'CAT002', name: 'Thực Phẩm', nameEn: 'Food', slug: 'thuc-pham', sortOrder: 2 },
  });
  const catVeSinh = await prisma.category.upsert({
    where: { code: 'CAT003' }, update: {},
    create: { code: 'CAT003', name: 'Vệ Sinh', nameEn: 'Hygiene', slug: 've-sinh', sortOrder: 3 },
  });
  const catGiaDung = await prisma.category.upsert({
    where: { code: 'CAT004' }, update: {},
    create: { code: 'CAT004', name: 'Gia Dụng', nameEn: 'Household', slug: 'gia-dung', sortOrder: 4 },
  });
  console.log('✅ Categories created');

  // Products
  const products = [
    { code: 'SP001', name: 'Nước Suối Lavie 500ml', unitId: 'unit-binh', categoryId: catDoUong.id, salePrice: 8000, costPrice: 5000, barcode: '8934673000018' },
    { code: 'SP002', name: 'Coca Cola 330ml', unitId: 'unit-binh', categoryId: catDoUong.id, salePrice: 12000, costPrice: 8000, barcode: '5449000054227' },
    { code: 'SP003', name: 'Pepsi 330ml', unitId: 'unit-binh', categoryId: catDoUong.id, salePrice: 11000, costPrice: 7500, barcode: '4001015000014' },
    { code: 'SP004', name: 'Sữa Vinamilk 1L', unitId: 'unit-hop', categoryId: catDoUong.id, salePrice: 35000, costPrice: 27000, barcode: '8936015800012' },
    { code: 'SP005', name: 'Mì Hảo Hảo Tôm Chua Cay', unitId: 'unit-goi', categoryId: catThucPham.id, salePrice: 5000, costPrice: 3500, barcode: '8934563129817' },
    { code: 'SP006', name: 'Bánh Oreo 137g', unitId: 'unit-hop', categoryId: catThucPham.id, salePrice: 22000, costPrice: 16000, barcode: '7622210951557' },
    { code: 'SP007', name: 'Pringles Khoai Tây 165g', unitId: 'unit-hop', categoryId: catThucPham.id, salePrice: 65000, costPrice: 48000, barcode: '038000845857' },
    { code: 'SP008', name: 'Bánh Kinh Đô Hộp 380g', unitId: 'unit-hop', categoryId: catThucPham.id, salePrice: 85000, costPrice: 62000, barcode: '8934694000116' },
    { code: 'SP009', name: 'Dầu Gội Clear Men 180ml', unitId: 'unit-binh', categoryId: catVeSinh.id, salePrice: 65000, costPrice: 48000, barcode: '8964000261003' },
    { code: 'SP010', name: 'Kem Đánh Răng PS 230g', unitId: 'unit-hop', categoryId: catVeSinh.id, salePrice: 32000, costPrice: 22000, barcode: '8934683490027' },
    { code: 'SP011', name: 'Xà Phòng Lifebuoy 90g', unitId: 'unit-cai', categoryId: catVeSinh.id, salePrice: 15000, costPrice: 10000, barcode: '8711600282779' },
    { code: 'SP012', name: 'Nước Rửa Bát Sunlight 750ml', unitId: 'unit-binh', categoryId: catGiaDung.id, salePrice: 35000, costPrice: 25000, barcode: '8690526081227' },
    { code: 'SP013', name: 'Nước Lau Sàn Vim 1L', unitId: 'unit-binh', categoryId: catGiaDung.id, salePrice: 28000, costPrice: 19000, barcode: '8690526063063' },
    { code: 'SP014', name: 'Tiger Beer 330ml', unitId: 'unit-binh', categoryId: catDoUong.id, salePrice: 18000, costPrice: 12000, barcode: '9556011001004' },
    { code: 'SP015', name: 'Nước Tăng Lực Sting 330ml', unitId: 'unit-binh', categoryId: catDoUong.id, salePrice: 10000, costPrice: 7000, barcode: '8935049100017' },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { code: p.code }, update: {},
      create: {
        ...p,
        slug: `${p.code.toLowerCase()}-${p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-')}`,
        isActive: true, taxRate: 0, minStock: 10,
      },
    });
    await upsertInventory(branch.id, product.id);
    await upsertInventory(branch2.id, product.id);
  }
  console.log(`✅ Products created: ${products.length}`);

  // Customers
  const customers = [
    { code: 'KH001', name: 'Nguyễn Văn An', phone: '0901234567', email: 'an.nguyen@gmail.com' },
    { code: 'KH002', name: 'Trần Thị Bình', phone: '0912345678', email: 'binh.tran@gmail.com' },
    { code: 'KH003', name: 'Lê Văn Cường', phone: '0923456789' },
    { code: 'KH004', name: 'Phạm Thị Dung', phone: '0934567890' },
    { code: 'KH005', name: 'Hoàng Văn Em', phone: '0945678901', points: 150, totalSpent: 1500000, totalOrders: 5 },
  ];
  for (const c of customers) {
    await prisma.customer.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  console.log('✅ Customers created');

  // Suppliers
  const suppliers = [
    { code: 'NCC001', name: 'Công ty TNHH Phân Phối Miền Nam', contactName: 'Nguyễn Văn A', phone: '028-3456-7890', email: 'ncc1@example.com' },
    { code: 'NCC002', name: 'Công ty CP Thực Phẩm Sài Gòn', contactName: 'Trần Thị B', phone: '028-2345-6789' },
    { code: 'NCC003', name: 'Đại lý Nước Giải Khát Toàn Phát', contactName: 'Lê Văn C', phone: '0901-123-456' },
  ];
  for (const s of suppliers) {
    await prisma.supplier.upsert({ where: { code: s.code }, update: {}, create: s });
  }
  console.log('✅ Suppliers created');

  // Expense categories
  const expCats = [
    { name: 'Thuê Mặt Bằng', nameEn: 'Rent', icon: '🏠' },
    { name: 'Điện Nước', nameEn: 'Utilities', icon: '💡' },
    { name: 'Nhân Sự', nameEn: 'Payroll', icon: '👥' },
    { name: 'Vận Chuyển', nameEn: 'Shipping', icon: '🚚' },
    { name: 'Marketing', nameEn: 'Marketing', icon: '📢' },
    { name: 'Bảo Trì', nameEn: 'Maintenance', icon: '🔧' },
    { name: 'Khác', nameEn: 'Other', icon: '📌' },
  ];
  for (const ec of expCats) {
    const existing = await prisma.expenseCategory.findFirst({ where: { name: ec.name } });
    if (!existing) await prisma.expenseCategory.create({ data: ec });
  }
  console.log('✅ Expense categories created');

  // Settings
  const settings = [
    { key: 'app.name', value: 'Hệ Thống Quản Lý Bán Hàng', group: 'app', label: 'Tên ứng dụng' },
    { key: 'app.currency', value: 'VND', group: 'app', label: 'Đơn vị tiền tệ' },
    { key: 'app.tax_rate', value: 0, group: 'app', label: 'Thuế suất mặc định (%)' },
    { key: 'loyalty.points_per_vnd', value: 1, group: 'loyalty', label: 'Điểm mỗi 10.000 VND' },
    { key: 'loyalty.vnd_per_point', value: 1000, group: 'loyalty', label: 'Giá trị mỗi điểm (VND)' },
    { key: 'receipt.footer', value: 'Cảm ơn quý khách! Hẹn gặp lại!', group: 'receipt', label: 'Footer hóa đơn' },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key }, update: {},
      create: { key: s.key, value: s.value as any, group: s.group, label: s.label },
    });
  }
  console.log('✅ Settings created');

  console.log('\n🎉 Database seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 Tài khoản đăng nhập:');
  console.log('   Super Admin: admin@retail.vn / Admin@2024');
  console.log('   Quản lý:     quan_ly@retail.vn / Manager@2024');
  console.log('   Thu ngân:    thu_ngan@retail.vn / Cashier@2024');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
