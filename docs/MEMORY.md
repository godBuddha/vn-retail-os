# 🧠 VN Retail OS — Memory (Bộ Nhớ Dự Án)

> **Cập nhật:** 2026-04-15  
> **Quy tắc:** File này là nguồn sự thật duy nhất về ngữ cảnh dự án.  
> Mỗi khi có thay đổi quan trọng, cập nhật vào đây trước tiên.

---

## 1. Tổng Quan Hệ Thống

**VN Retail OS** — Phần mềm quản lý bán lẻ full-stack cho thị trường Việt Nam.

| Layer | Stack |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + TailwindCSS |
| Backend API | NestJS + Prisma ORM |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Email | Resend API + MailDev (dev) |
| In hóa đơn | QZ Tray (WebSocket, ESC/POS) |
| PWA | `@ducanh2912/next-pwa` (Workbox) |
| Auth | JWT + 2FA TOTP (Google Authenticator) |
| Repo | pnpm workspaces (monorepo) |

---

## 2. Cấu Trúc Thư Mục

```
retail-management/
├── api/                        # NestJS backend (port 3001)
│   ├── src/
│   │   ├── auth/               # JWT + 2FA
│   │   ├── products/           # CRUD + barcode + import bulk
│   │   ├── orders/             # POS đặt hàng + shifts + refund
│   │   ├── payments/           # Cash, QR, VNPay, MoMo
│   │   ├── bank-accounts/      # TK ngân hàng + QR upload
│   │   ├── customers/          # CRM
│   │   ├── suppliers/          # Nhà cung cấp
│   │   ├── inventory/          # Kho + điều chỉnh
│   │   ├── finance/            # Thu/chi thủ công
│   │   ├── reports/            # Doanh thu, Top SP, KPIs
│   │   ├── promotions/         # Khuyến mãi
│   │   ├── mail/               # Resend API integration
│   │   ├── mail-log/           # Lịch sử email
│   │   ├── settings/           # SystemSettings key-value
│   │   ├── users/              # CRUD + RBAC
│   │   ├── branches/           # Đa chi nhánh
│   │   └── notifications/      # Push thông báo
│   └── prisma/
│       └── schema.prisma       # 30+ models
├── web/                        # Next.js frontend (port 3000)
│   └── src/
│       ├── app/(dashboard)/    # Tất cả trang dashboard
│       ├── components/         # Shared components
│       ├── hooks/              # useHotkeys, useThermalPrinter, ...
│       ├── lib/                # exportToExcel, receipt.utils, api
│       └── stores/             # Zustand stores
└── docs/                       # 📁 File bộ nhớ dự án (thư mục này)
    ├── MEMORY.md               # File này
    ├── TASK.md                 # Task board
    ├── PLAN.md                 # Implementation plan
    └── WALKTHROUGH.md          # Báo cáo tổng kết
```

---

## 3. Môi Trường Chạy

```bash
# Khởi động toàn bộ (từ thư mục gốc)
docker-compose up -d            # PostgreSQL + Redis + MailDev
cd api && npm run start:dev     # Backend port 3001
cd web && npm run dev           # Frontend port 3000

# MailDev UI: http://localhost:1080
# API docs: http://localhost:3001/api (Swagger)
```

---

## 4. Ngữ Cảnh Phát Triển Quan Trọng

### CSS Theme Variables (không dùng hardcode dark colors)
```
bg-background, bg-card, bg-muted, bg-accent
text-foreground, text-muted-foreground
border-border
hover:bg-accent
```
> ⚠️ KHÔNG dùng `bg-slate-900`, `text-white` hardcode — sẽ vỡ light mode!

### CSV Export — Tab Delimiter
```typescript
// ĐÚNG: dùng \t để Mac Numbers / Excel tự nhận cột
const rows = data.map(r => [r.a, r.b, r.c].join('\t'));
const blob = new Blob([rows.join('\n')], { type: 'text/tab-separated-values;charset=utf-8' });
```
> ⚠️ KHÔNG dùng `,` — locale tiếng Việt dùng phẩy cho số → gộp cột!

### Excel Export — Light Theme (exportToExcel.ts)
```
Header:      bg #7C3AED (violet), text white, bold
Data rows:   alternating #FAF9FF (lavender) / #FFFFFF, text #1E293B (slate-900)
Summary row: bg #6D28D9 (violet dark), text white, bold
Thu (Finance): text #15803D (green-700)
Chi (Finance): text #C2410C (red-700)
```

### Iframe Email — Light Mode
```typescript
// ĐÚNG: inject full HTML wrapper với color-scheme: light
srcDoc={`<!DOCTYPE html><html><head><style>
  html, body { background: #fff !important; color-scheme: light !important; }
</style></head><body>${email.bodyHtml}</body></html>`}
```
> ⚠️ KHÔNG set `srcDoc={email.bodyHtml}` trực tiếp — inherit dark mode từ app!

### QZ Tray — In nhiệt
```
Cài đặt: lưu trong localStorage key 'retailos_print_settings_{branchId}'
58mm: 32 ký tự/dòng | 80mm: 48 ký tự/dòng
Fallback: window.print() nếu QZ không available
```

### PWA
```
manifest.json: /public/manifest.json
Icon: tone violet #7c3aed, túi market + biểu đồ
start_url: /pos
```

---

## 5. Vấn Đề Đã Biết

| Vấn đề | Nguyên nhân | Cách fix |
|---|---|---|
| Linting: `twoFactorSecret` không tồn tại trong Prisma type | Migration chưa apply hoặc client chưa generate | `cd api && npx prisma migrate dev && npx prisma generate` |
| Linting: `emailLog` không tồn tại trong PrismaService | Model `EmailLog` chưa được add vào schema | Thêm model vào `schema.prisma` → migrate → generate |
| QZ Tray không kết nối | Java + QZ Tray chưa cài | Cài theo hướng dẫn tại Settings > Cài đặt in |

---

## 6. Dependencies Đặc Biệt

```json
{
  "exceljs": "^4.x",           // Excel export
  "file-saver": "^2.x",        // Download file
  "qz-tray": "^2.x",           // In nhiệt WebSocket
  "@ducanh2912/next-pwa": "^10.x", // PWA
  "resend": "^4.x",            // Email
  "date-fns": "^3.x",          // Date formatting
  "recharts": "^2.x",          // Biểu đồ
  "zustand": "^4.x"            // State management
}
```
