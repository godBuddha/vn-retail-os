import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, search, categoryId, isActive, minPrice, maxPrice, lowStock, branchId } = query;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search } },
    ];
    if (categoryId) where.categoryId = categoryId;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (minPrice) where.salePrice = { ...where.salePrice, gte: parseFloat(minPrice) };
    if (maxPrice) where.salePrice = { ...where.salePrice, lte: parseFloat(maxPrice) };

    let inventoryFilter: any = undefined;
    if (lowStock === 'true' && branchId) {
      inventoryFilter = { some: { branchId, quantity: { lte: 10 } } };
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { ...where, ...(inventoryFilter && { inventory: inventoryFilter }) },
        skip, take: Number(limit),
        include: {
          category: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true, symbol: true } },
          variants: { where: { isActive: true } },
          inventory: branchId ? { where: { branchId } } : true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id, deletedAt: null },
      include: {
        category: true, unit: true,
        variants: { where: { isActive: true } },
        inventory: { include: { branch: { select: { id: true, name: true } } } },
      },
    });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
    return product;
  }

  async create(dto: any) {
    const { variants, sellingPrice, unit, sku, ...rest } = dto;

    // Map frontend aliases → schema field names
    if (sellingPrice !== undefined && rest.salePrice === undefined) {
      rest.salePrice = sellingPrice;
    }
    const code = rest.code || sku || `SP${Date.now()}`;
    const slug = rest.slug || this.toSlug(rest.name) + '-' + Date.now();

    return this.prisma.product.create({
      data: {
        ...rest, code, slug,
        variants: variants?.length ? { create: variants } : undefined,
      },
      include: { category: true, unit: true, variants: true },
    });
  }



  async update(id: string, dto: any) {
    await this.findOne(id);
    const { variants, sellingPrice, unit, sku, ...rest } = dto;
    if (sellingPrice !== undefined && rest.salePrice === undefined) {
      rest.salePrice = sellingPrice;
    }
    return this.prisma.product.update({
      where: { id }, data: rest,
      include: { category: true, unit: true, variants: true },
    });
  }


  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { message: 'Xóa sản phẩm thành công' };
  }

  async bulkImport(products: any[]) {
    const created = [];
    const errors = [];
    for (const p of products) {
      try {
        const slug = this.toSlug(p.name) + '-' + Date.now() + Math.random();
        const code = p.code || `SP${Date.now()}${Math.random()}`;
        const prod = await this.prisma.product.upsert({
          where: { code },
          create: { ...p, code, slug },
          update: { ...p },
        });
        created.push(prod);
      } catch (e) { errors.push({ product: p.name, error: e.message }); }
    }
    return { created: created.length, errors };
  }

  async searchByBarcode(barcode: string, branchId?: string) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ barcode }, { variants: { some: { barcode } } }], isActive: true, deletedAt: null },
      include: {
        unit: true,
        variants: { where: { barcode } },
        inventory: branchId ? { where: { branchId } } : false,
      },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm với mã vạch này');
    return product;
  }

  // Categories
  async getCategories() {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      include: { children: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(dto: any) {
    const slug = dto.slug || this.toSlug(dto.name) + '-' + Date.now();
    const code = dto.code || `CAT${Date.now()}`;
    return this.prisma.category.create({ data: { ...dto, slug, code } });
  }

  // Units
  async getUnits() {
    return this.prisma.unit.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  private toSlug(text: string): string {
    return text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-');
  }
}
