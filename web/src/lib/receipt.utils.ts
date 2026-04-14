import { formatCurrency } from './utils';

export type PaperSize = '58mm' | '80mm';

const getLineLength = (size: PaperSize) => (size === '58mm' ? 32 : 48);

const padRight = (text: string, length: number) => {
  if (text.length >= length) return text.substring(0, length);
  return text.padEnd(length, ' ');
};

const padLeft = (text: string, length: number) => {
  if (text.length >= length) return text.substring(0, length);
  return text.padStart(length, ' ');
};

const padBoth = (text: string, length: number) => {
  if (text.length >= length) return text.substring(0, length);
  const leftRemaining = Math.floor((length - text.length) / 2);
  const rightRemaining = length - text.length - leftRemaining;
  return ' '.repeat(leftRemaining) + text + ' '.repeat(rightRemaining);
};

export const generateThermalReceiptData = (order: any, storeName: string, size: PaperSize = '80mm') => {
  const lineLength = getLineLength(size);
  const sep = '-'.repeat(lineLength);
  const eqSep = '='.repeat(lineLength);

  const data: any[] = [];
  
  // Initialization & encoding
  data.push('\x1B\x40'); // Init
  data.push('\x1B\x74\x10'); // CP1258 or typical UTF-8 handling can be tricky, we assume QZ handles transliteration if needed, or we just send standard text.

  // Header
  data.push('\x1B\x61\x01'); // Center alignment
  data.push('\x1B\x21\x10'); // Double height text
  data.push(`${padBoth(storeName, lineLength)}\n`);
  data.push('\x1B\x21\x00'); // Normal text
  data.push(`${padBoth('HOA DON BAN HANG', lineLength)}\n`);
  data.push(`${padBoth(`Ma: ${order.code}`, lineLength)}\n`);
  data.push(`${padBoth(`Ngay: ${new Date(order.createdAt).toLocaleString('vi-VN')}`, lineLength)}\n`);
  data.push('\x1B\x61\x00'); // Left alignment
  data.push(`${sep}\n`);

  // Items Header
  if (size === '58mm') {
    // Tên (SLxGia)        Thành tiền
    data.push(`Ten(SLxGia)             Th.Tien\n`);
  } else {
    // Tên                    SL    Giá      Thành tiền
    data.push(`${padRight('Ten san pham', 20)}${padLeft('SL', 6)}${padLeft('Gia', 10)}${padLeft('Th.Tien', 12)}\n`);
  }
  data.push(`${sep}\n`);

  // Items
  order.items.forEach((item: any) => {
    const itemName = item.product?.name || 'San pham';
    const cleanName = itemName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D'); // ASCII conversion for thermal printer safety
    
    if (size === '58mm') {
      const line1 = padRight(cleanName, lineLength);
      const priceStr = `${item.quantity} x ${formatCurrency(Number(item.price))}`;
      const totalStr = formatCurrency(Number(item.price) * item.quantity);
      // "  2 x 10,000đ            20,000đ"
      const maxPriceLength = lineLength - totalStr.length;
      const line2 = padRight(`  ${priceStr}`, maxPriceLength) + totalStr;
      data.push(`${line1}\n${line2}\n`);
    } else {
      let namePart = cleanName;
      if (namePart.length > 20) namePart = namePart.substring(0, 17) + '...';
      const qtyPart = item.quantity.toString();
      const pricePart = formatCurrency(Number(item.price)).replace('đ','');
      const totalPart = formatCurrency(Number(item.price) * item.quantity).replace('đ','');
      data.push(`${padRight(namePart, 20)}${padLeft(qtyPart, 6)}${padLeft(pricePart, 10)}${padLeft(totalPart, 12)}\n`);
    }
  });

  data.push(`${sep}\n`);

  // Summary
  data.push('\x1B\x61\x02'); // Right alignment
  const originTotal = Number(order.total) + Number(order.discountAmount || 0);
  data.push(`Tong tien: ${formatCurrency(originTotal)}\n`);
  if (order.discountAmount > 0) {
    data.push(`Giam gia: -${formatCurrency(Number(order.discountAmount))}\n`);
  }
  data.push('\x1B\x21\x10'); // Double height text
  data.push(`Khach phai tra: ${formatCurrency(Number(order.total))}\n`);
  data.push('\x1B\x21\x00'); // Normal text
  
  if (order.payments?.[0]) {
    data.push(`Tien khach dua: ${formatCurrency(Number(order.payments[0].amount))}\n`);
    const change = Number(order.payments[0].amount) - Number(order.total);
    if (change > 0) {
      data.push(`Tra lai khach: ${formatCurrency(change)}\n`);
    }
  }

  // Footer
  data.push('\x1B\x61\x01'); // Center alignment
  data.push(`${eqSep}\n`);
  data.push(`${padBoth('Cam on quy khach!', lineLength)}\n`);
  data.push(`${padBoth('Hen gap lai!!', lineLength)}\n\n\n\n`); // Feed paper
  
  // Cut paper
  data.push('\x1D\x56\x41\x00');

  return data;
};
