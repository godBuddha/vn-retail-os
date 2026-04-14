import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

const applyTheme = (worksheet: ExcelJS.Worksheet, rowCount: number, colCount: number) => {
  // ── Professional LIGHT theme ──────────────────────────────────────────────
  const HEADER_BG   = 'FF7C3AED'; // violet-600  — header background
  const HEADER_FG   = 'FFFFFFFF'; // white        — header text
  const ROW_ODD_BG  = 'FFFAF9FF'; // lavender-50  — odd row tint
  const ROW_EVEN_BG = 'FFFFFFFF'; // white        — even row
  const ROW_FG      = 'FF1E293B'; // slate-900    — body text (max contrast)
  const BORDER_CLR  = 'FFE2E8F0'; // slate-200    — subtle grid lines

  // 1. Header row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 32;
  for (let c = 1; c <= colCount; c++) {
    const cell = headerRow.getCell(c);
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.font   = { color: { argb: HEADER_FG }, bold: true, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF6D28D9' } },
    };
  }

  // 2. Data rows — alternating white / light lavender
  for (let r = 2; r <= rowCount; r++) {
    const row = worksheet.getRow(r);
    row.height = 22;
    const bgColor = r % 2 === 0 ? ROW_EVEN_BG : ROW_ODD_BG;
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      // Only set color if the cell doesn't already have a custom font color set
      if (!cell.font?.color || cell.font.color.argb === 'FF000000') {
        cell.font = { ...(cell.font || {}), color: { argb: ROW_FG } };
      }
      cell.border = {
        bottom: { style: 'thin', color: { argb: BORDER_CLR } },
        right:  { style: 'thin', color: { argb: BORDER_CLR } },
      };
    }
  }

  // 3. Freeze top row
  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
};

const autoWidth = (worksheet: ExcelJS.Worksheet) => {
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell!({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = maxLength < 10 ? 10 : maxLength + 2;
  });
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Tiền Mặt',
  QR_MANUAL: 'QR Chuyển Khoản',
  VNPAY: 'VNPay',
  MOMO: 'MoMo',
  BANK_TRANSFER: 'Ngân Hàng',
  OTHER: 'Khác',
};

export const exportRevenueToExcel = async (data: any[], dateRange: string) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VN Retail OS';
  const sheet = workbook.addWorksheet('Báo Cáo Doanh Thu');

  // Columns definition
  sheet.columns = [
    { header: 'Mã đơn', key: 'code', width: 20 },
    { header: 'Ngày giờ', key: 'createdAt', width: 25 },
    { header: 'Khách hàng', key: 'customer', width: 30 },
    { header: 'Thu ngân', key: 'staff', width: 25 },
    { header: 'PT Thanh toán', key: 'paymentMethod', width: 22 },
    { header: 'Giảm giá', key: 'discount', width: 18 },
    { header: 'Tổng tiền', key: 'total', width: 20 },
  ];

  // Add data — use `total` and resolve payment method from payments array
  data.forEach((order) => {
    const methodKey = order.payments?.[0]?.method || order.paymentMethod || 'OTHER';
    sheet.addRow({
      code: order.code,
      createdAt: format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm'),
      customer: order.customer?.name || 'Khách lẻ',
      staff: order.user?.name || order.staff?.name || '—',
      paymentMethod: PAYMENT_METHOD_LABELS[methodKey] || methodKey,
      discount: Number(order.discountAmount || 0),
      total: Number(order.total || order.totalAmount || 0),
    });
  });

  const rowCount = data.length + 1;
  const colCount = sheet.columns.length;

  applyTheme(sheet, rowCount, colCount);

  // Format currency columns
  sheet.getColumn('discount').numFmt = '#,##0"đ"';
  sheet.getColumn('total').numFmt = '#,##0"đ"';
  sheet.getColumn('total').font = { bold: true };

  // Summary row — violet background, white bold text
  const totalSum = data.reduce((s, o) => s + Number(o.total || o.totalAmount || 0), 0);
  const summaryRow = sheet.addRow({ code: 'TỔNG CỘNG', total: totalSum });
  for (let c = 1; c <= sheet.columns.length; c++) {
    const cell = summaryRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  }
  summaryRow.getCell('total').numFmt = '#,##0"đ"';
  summaryRow.getCell('total').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

  autoWidth(sheet);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Doanh_Thu_${dateRange.replace(/ /g, '_')}.xlsx`);
};

export const exportFinanceToExcel = async (
  transactions: any[],
  summary: any,
  monthYear: string,
  orders?: any[],  // optional revenue orders to show as INCOME rows
) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`Tài Chính ${monthYear}`);

  sheet.columns = [
    { header: 'Mã Giao dịch', key: 'code', width: 22 },
    { header: 'Ngày tạo', key: 'date', width: 22 },
    { header: 'Loại', key: 'type', width: 10 },
    { header: 'Danh mục', key: 'category', width: 22 },
    { header: 'Người thực hiện', key: 'actor', width: 25 },
    { header: 'Nội dung', key: 'description', width: 38 },
    { header: 'Số tiền', key: 'amount', width: 20 },
  ];

  // 1. Add revenue orders as INCOME if provided
  (orders || []).forEach((o) => {
    const methodKey = o.payments?.[0]?.method || o.paymentMethod || 'CASH';
    sheet.addRow({
      code: o.code,
      date: o.createdAt ? format(new Date(o.createdAt), 'dd/MM/yyyy HH:mm') : '',
      type: 'Thu',
      category: 'Doanh Thu Bán Hàng',
      actor: o.user?.name || o.staff?.name || '—',
      description: `Đơn hàng ${o.code} · ${PAYMENT_METHOD_LABELS[methodKey] || methodKey}`,
      amount: Number(o.total || o.totalAmount || 0),
    });
  });

  // 2. Add manual expense/income transactions
  transactions.forEach((tx) => {
    sheet.addRow({
      code: tx.code || `TX-${tx.id?.slice(-8).toUpperCase() || ''}`,
      date: tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm') : (tx.date ? format(new Date(tx.date), 'dd/MM/yyyy') : ''),
      type: tx.type === 'INCOME' ? 'Thu' : 'Chi',
      category: tx.category || '—',
      actor: tx.assignedTo || '—',
      description: tx.description || '',
      amount: Number(tx.amount || 0),
    });
  });

  const totalRows = (orders?.length || 0) + transactions.length + 1;
  applyTheme(sheet, totalRows, sheet.columns.length);

  sheet.getColumn('amount').numFmt = '#,##0"đ"';
  sheet.getColumn('amount').eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 1 && cell.value !== null) {
      const typeStr = sheet.getCell(`C${rowNumber}`).value;
      if (typeStr === 'Thu') {
        // Dark green — readable on white/lavender background
        cell.font = { color: { argb: 'FF15803D' }, bold: true };
      } else if (typeStr === 'Chi') {
        // Dark red — readable on white/lavender background
        cell.font = { color: { argb: 'FFC2410C' }, bold: true };
      }
    }
  });

  autoWidth(sheet);

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Tổng Kết');
  summarySheet.columns = [
    { header: 'Chỉ số', key: 'metric', width: 30 },
    { header: 'Giá trị', key: 'value', width: 30 },
  ];
  summarySheet.addRow({ metric: 'Tổng Doanh Thu', value: summary.income });
  summarySheet.addRow({ metric: 'Tổng Chi Phí', value: summary.expense });
  summarySheet.addRow({ metric: 'Lợi Nhuận Ròng', value: summary.profit });

  applyTheme(summarySheet, 4, 2);
  summarySheet.getColumn('value').numFmt = '#,##0"đ"';

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Tai_Chinh_${monthYear}.xlsx`);
};

export const exportProductsToXlsx = async (products: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sản Phẩm');

  sheet.columns = [
    { header: 'Mã SP', key: 'sku', width: 15 },
    { header: 'Tên Sản Phẩm', key: 'name', width: 40 },
    { header: 'Danh Mục', key: 'category', width: 25 },
    { header: 'Giá Bán', key: 'price', width: 20 },
    { header: 'Còn Tồn', key: 'stock', width: 15 },
    { header: 'Trạng thái', key: 'status', width: 15 },
  ];

  products.forEach((p) => {
    sheet.addRow({
      sku: p.sku || '—',
      name: p.name,
      category: p.category?.name || '—',
      price: p.salePrice || 0,
      stock: p.stockQuantity || 0,
      status: p.isActive ? 'Đang bán' : 'Ngừng bán',
    });
  });

  applyTheme(sheet, products.length + 1, sheet.columns.length);
  sheet.getColumn('price').numFmt = '#,##0"đ"';
  autoWidth(sheet);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `DanhSach_SanPham_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
};
