# 📋 VN Retail OS — Báo Cáo Tổng Kết Toàn Diện

> **Phiên bản:** Đồng bộ đầy đủ từ toàn bộ lịch sử dự án  
> **Cập nhật lần cuối:** 2026-04-15 00:00 ICT  
> **Nguồn:** Conversation `1a4d1ca4` (Phase 1-3) + `a7b7b903` (Phase 4 + Hotfixes)  
> **Trạng thái hệ thống:** ✅ Production-Ready (Core)  
> **Môi trường:** `localhost:3000` (Frontend) · `localhost:3001` (Backend API)

---

## 1. Tổng Quan Hệ Thống

**VN Retail OS** là phần mềm quản lý bán lẻ full-stack dành thị trường Việt Nam, được xây dựng với:

| Layer | Stack |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + TailwindCSS |
| Backend API | NestJS + Prisma ORM |
| Database | PostgreSQL |
| Cache | Redis |
| Email | Resend API |
| In hóa đơn | QZ Tray (WebSocket) |
| PWA | `@ducanh2912/next-pwa` (Workbox) |
| Auth | JWT + 2FA TOTP (Google Authenticator) |
| Monorepo | pnpm workspaces |

---

## 2. Các Module Đã Hoàn Thiện

### 🛒 Bán hàng (POS)
- **POS Interface** — tìm sản phẩm, thêm vào giỏ, chọn khách hàng
- **Phím tắt** — F2 (tìm kiếm), F9 (thanh toán), F12 (xóa giỏ), Enter (xác nhận), Esc (đóng modal)
- **Thanh toán** — Tiền mặt, QR, VNPay, MoMo, chuyển khoản
- **Giảm giá** — Nhập % hoặc số tiền, áp dụng khuyến mãi
- **In hóa đơn** — QZ Tray (in nhiệt trực tiếp) hoặc browser print fallback
- **Quản lý ca** — Mở/đóng ca, theo dõi doanh thu theo ca

### 📦 Kho & Sản phẩm
- **Danh sách sản phẩm** — search, filter, phân trang
- **Import sản phẩm** — Drag-drop Excel/CSV, preview trước khi import
- **Xuất danh sách** — Excel (.xlsx) format bảng chuyên nghiệp
- **In nhãn barcode** — chọn nhiều sản phẩm, in hàng loạt
- **Kho hàng** — xem tồn kho, điều chỉnh số lượng, lịch sử
- **Nhập hàng (PO)** — tạo phiếu nhập hàng từ nhà cung cấp

### 👥 Khách hàng & Đối tác
- **Khách hàng** — thêm/sửa/xóa, lịch sử mua hàng
- **Nhà cung cấp** — quản lý thông tin, liên kết với PO

### 📊 Báo cáo & Tài chính
- **Báo cáo doanh thu** — biểu đồ theo ngày/tuần/tháng, Top sản phẩm
- **Xuất dữ liệu báo cáo** — Excel (.xlsx) + CSV (tab-separated)
- **Báo cáo tài chính** — thu/chi thủ công + doanh thu đơn hàng tự động
- **Xuất tài chính** — Excel (2 sheets: giao dịch + tổng kết) + CSV

### 🔧 Vận hành
- **Khuyến mãi** — tạo chương trình giảm giá, áp dụng điều kiện
- **Nhân sự (HR)** — quản lý nhân viên theo chi nhánh

### ⚙️ Hệ thống & Admin
- **Đa chi nhánh** — chuyển đổi chi nhánh, phân quyền theo branch
- **Phân quyền** — SUPER_ADMIN, ADMIN, MANAGER, STAFF
- **2FA TOTP** — bảo mật tài khoản qua Google Authenticator
- **Email system** — Resend API, Mail Center (inbox/sent/starred/trash)
- **Dark/Light mode** — toggle theme toàn hệ thống
- **PWA** — cài như app native, hoạt động offline
- **Settings** — cài đặt cửa hàng, máy in nhiệt, thông báo, tích hợp

---

## 3. Lỗi Đã Xử Lý (Session Này)

### 3.1 CSV Export — Dữ liệu gộp vào 1 cột
**Root Cause:** Mac Numbers không tự nhận dấu phẩy làm delimiter do locale tiếng Việt dùng dấu phẩy cho số nghìn.

**Fix:**
```
Đổi delimiter: , → \t (tab)
Đổi MIME type: text/csv → text/tab-separated-values;charset=utf-8
```

**Files:** `reports/page.tsx`, `finance/page.tsx`

---

### 3.2 Excel Finance — Sheet trống không có dữ liệu
**Root Cause:** `exportFinanceToExcel` chỉ nhận manual expenses. Tháng không có bút toán thủ công → sheet rỗng.

**Fix:** Expose `rawOrders` từ revenue query → truyền vào hàm export → mỗi đơn hàng = 1 dòng "Thu / Doanh Thu Bán Hàng".

**File:** `finance/page.tsx`, `exportToExcel.ts`

---

### 3.3 Excel Theme — Chữ khó đọc (dark theme trên light background)
**Root Cause:** `applyTheme` dùng nền navy/slate-900 + chữ slate-200 (sáng). Khi mở file, một số cell bị override font màu đen → đen trên đen hoặc sáng trên sáng.

**Fix:** Redesign sang light theme:

| Phần tử | Nền | Chữ |
|---|---|---|
| Header | `#7C3AED` violet | Trắng in đậm |
| Hàng lẻ | `#FAF9FF` lavender | `#1E293B` slate |
| Hàng chẵn | `#FFFFFF` trắng | `#1E293B` slate |
| TỔNG CỘNG | `#6D28D9` violet đậm | Trắng in đậm |
| Thu (Finance) | — | `#15803D` xanh đậm |
| Chi (Finance) | — | `#C2410C` đỏ đậm |

**File:** `src/lib/exportToExcel.ts`

---

### 3.4 Mail Center — Nền tối trong Light Mode
**Root Cause:** Toàn bộ `mail/page.tsx` dùng hardcode Tailwind dark colors (`bg-slate-900`, `text-white`...) thay vì CSS theme variables.

**Fix:** Rewrite toàn bộ file dùng:
- `bg-card`, `bg-background`, `bg-muted` (thay `bg-slate-900/800/950`)
- `text-foreground`, `text-muted-foreground` (thay `text-white/slate-400`)
- `border-border` (thay `border-slate-700`)
- `hover:bg-accent` (thay `hover:bg-slate-800`)

**File:** `src/app/(dashboard)/mail/page.tsx`

---

### 3.5 Mail Center Iframe — Nội dung email nền đen
**Root Cause:** iframe tạo document riêng và kế thừa `color-scheme: dark` từ app CSS. HTML email không có explicit background → browser render nền đen.

**Fix:** Inject HTML wrapper đầy đủ vào `srcDoc`:
```html
<!DOCTYPE html><html><head><style>
  html, body {
    background: #ffffff !important;
    color: #1e293b !important;
    color-scheme: light !important;
  }
</style></head><body style="padding:24px;">
  {email.bodyHtml}
</body></html>
```

**File:** `src/app/(dashboard)/mail/page.tsx`

---

## 4. Kiến Trúc File Quan Trọng

```
web/src/
├── app/(dashboard)/
│   ├── pos/page.tsx              # POS chính
│   ├── reports/page.tsx          # Báo cáo + xuất CSV/Excel
│   ├── finance/page.tsx          # Tài chính + xuất CSV/Excel
│   ├── mail/page.tsx             # Mail Center (theme-aware)
│   ├── products/
│   │   ├── page.tsx              # Danh sách + xuất Excel
│   │   └── import/page.tsx       # Import từ CSV/Excel
│   └── settings/
│       └── receipt/page.tsx      # Cài đặt máy in nhiệt
├── lib/
│   ├── exportToExcel.ts          # Export Excel (light theme)
│   ├── receipt.utils.ts          # ESC/POS builder
│   └── api.ts                    # Axios instance
└── hooks/
    ├── useHotkeys.ts             # Global keyboard shortcuts
    └── useThermalPrinter.ts      # QZ Tray integration
```

---

## 5. Dependencies Đã Cài

```json
{
  "exceljs": "^4.x",
  "file-saver": "^2.x",
  "qz-tray": "^2.x",
  "@ducanh2912/next-pwa": "^10.x",
  "resend": "^4.x"
}
```

---

## 6. Vấn Đề Tồn Đọng

| Vấn đề | Mức độ | Giải pháp |
|---|---|---|
| Linting Prisma: `twoFactorSecret`, `isTwoFactorEnabled`, `emailLog` | ⚠️ Warning | Chạy `prisma migrate dev` + `prisma generate` |
| QZ Tray chưa cài trên máy thật | ℹ️ Info | Cài Java + QZ Tray desktop app |
| Dữ liệu thực tế ít | ℹ️ Info | Nhập dữ liệu thật vào production |

---

## 7. Kết Quả Kiểm Tra (Đã Verify)

| Test | Kết quả |
|---|---|
| CSV đơn hàng (7 records) tách đúng cột | ✅ Toast "Đã xuất 7 đơn hàng" |
| CSV tài chính tách đúng cột | ✅ Toast "Đã xuất báo cáo tháng 4 năm 2026" |
| CSV top sản phẩm | ✅ Thành công |
| Excel báo cáo doanh thu — light theme | ✅ Header violet, data rows đọc được |
| Excel tài chính — có dữ liệu đơn hàng | ✅ Sheet "Tài Chính" + "Tổng Kết" |
| F2 POS → focus search | ✅ |
| F9 POS → mở payment modal | ✅ |
| Mail Center light mode | ✅ Tất cả panel/sidebar/input đúng màu |
| Mail Center iframe nội dung | ✅ Nền trắng, chữ tối, đọc được |
| PWA manifest + icons | ✅ |
| QZ Tray settings (58mm/80mm) | ✅ UI hiển thị đúng |

---

## 8. Bước Tiếp Theo (Khuyến Nghị)

### Ngắn hạn
1. **Fix Prisma linting** — chạy migration + regenerate client
2. **Test QZ Tray thật** — cài lên máy in nhiệt thực tế
3. **Nhập dữ liệu thật** — sản phẩm, khách hàng, lịch sử đơn hàng

### Trung hạn (nếu muốn nâng cấp)
4. **Loyalty points** — tích điểm theo đơn, đổi điểm giảm giá
5. **Báo cáo nâng cao** — lợi nhuận theo sản phẩm, dự báo tồn kho
6. **VNPay/MoMo gateway thật** — tích hợp SDK thanh toán trực tiếp

### Dài hạn
7. **App mobile** — React Native/Expo
8. **Dashboard realtime** — WebSocket live doanh thu
9. **Multi-store** — quản lý nhiều cửa hàng từ 1 tài khoản
