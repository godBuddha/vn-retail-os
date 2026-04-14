# 🏪 VN Retail OS — Master Task Board

> **Đồng bộ toàn dự án:** 2026-04-15 00:00 ICT  
> **Nguồn:** Tổng hợp từ conversation `1a4d1ca4` (Phase 1-3) + `a7b7b903` (Phase 4 + Hotfixes)

---

## ✅ Phase 1: Core Foundation — HOÀN THÀNH

### Infrastructure
- [x] Monorepo structure (Turborepo + pnpm)
- [x] Docker Compose (PostgreSQL 16 + Redis 7 + MailDev)
- [x] NestJS API skeleton + main.ts + CORS + throttler
- [x] Next.js 14 app skeleton (App Router)
- [x] Prisma schema (30+ tables)
- [x] Environment variables setup (.env)

### Auth & RBAC
- [x] AuthModule: Login, Logout, Register, Refresh Token
- [x] JWT strategy + Guards + Decorators (Roles/Public)
- [x] Forgot password (email flow)
- [x] RBAC roles: SUPER_ADMIN, BRANCH_ADMIN, MANAGER, CASHIER, WAREHOUSE, ACCOUNTANT
- [x] Frontend: Login page (dark glassmorphism)
- [x] Frontend: AuthGuard (Zustand persist)

### Products & Orders Backend
- [x] ProductsModule: CRUD, barcode search, bulk import, categories, units
- [x] OrdersModule: POS create order, inventory deduction, loyalty points, shifts, refund
- [x] UsersModule: CRUD, RBAC, branch assignment

### Frontend Foundation
- [x] Global CSS (dark theme + light theme, variables, utility classes)
- [x] Stores (Zustand: AuthStore + CartStore)
- [x] i18n (vi/en với Zustand persist)
- [x] API client (axios + interceptors + auto refresh token)
- [x] Layout: Sidebar collapsible + Header (branch/lang/user)
- [x] Dashboard: Stats cards, recent orders, low stock, quick actions

### Database
- [x] Prisma migration (20260406035323_init)
- [x] Seed: 2 branches, 3 users, 15 products, 5 customers, 3 suppliers

---

## ✅ Phase 2: POS + Payments + Core Pages — HOÀN THÀNH

### Backend
- [x] BankAccount model (ngân hàng + QR upload)
- [x] Payment fields mở rộng trong OrderPayment (ref, gateway, status)
- [x] BankAccountsModule: CRUD + upload QR + set-default
- [x] PaymentsModule: Cash, QR Manual, VNPay URL, MoMo
- [x] Upload module (multer + static serve `/uploads/`)

### Frontend — POS
- [x] `/pos/page.tsx` — layout 2 cột (product grid + cart)
- [x] Product search + category filter + barcode scanner
- [x] Cart management (add/remove/quantity)
- [x] Customer selector
- [x] Discount input (% hoặc số tiền)
- [x] `payment-modal.tsx` — 4 tabs (Tiền mặt, QR, VNPay, MoMo)
- [x] `receipt-modal.tsx` — in hóa đơn (react-to-print + PDF)
- [x] Shift management (mở ca / đóng ca)
- [x] Barcode scanner component

### Frontend — Settings > Payments
- [x] Toggle bật/tắt từng phương thức thanh toán
- [x] CRUD tài khoản ngân hàng + upload ảnh QR
- [x] Form cấu hình VNPay (TMN Code + Hash Secret)
- [x] Form cấu hình MoMo (Partner Code + Keys)

### Frontend — Core Pages
- [x] `/products/page.tsx` — danh sách + filter + search + pagination
- [x] `/products/new` và `/products/[id]/edit` — form CRUD
- [x] `/orders/page.tsx` — danh sách + filter
- [x] `/orders/[id]/page.tsx` — chi tiết đơn + confirm QR + hoàn trả

---

## ✅ Phase 3: ERP + CRM + Reports — HOÀN THÀNH

### CRM & Operations
- [x] Trang Khách Hàng — CRM + lịch sử mua hàng
- [x] Trang Nhà Cung Cấp
- [x] Trang Kho Hàng — tồn kho, điều chỉnh, lịch sử
- [x] Quản lý Nhập Hàng (Purchase Orders)
- [x] Nhân Sự — quản lý nhân viên theo chi nhánh
- [x] Import sản phẩm từ Excel/CSV (drag-drop, 3 bước wizard)
- [x] In nhãn barcode (chọn nhiều sản phẩm, in hàng loạt)

### Finance & Reports
- [x] Tài Chính: thu/chi thủ công, biểu đồ doanh thu theo ngày
- [x] Báo Cáo: KPI cards, Top sản phẩm bán chạy, biểu đồ Recharts
- [x] Khuyến Mãi: tạo chương trình, áp dụng điều kiện
- [x] Xuất CSV doanh thu + tài chính (lần đầu dùng dấu phẩy)

### Auth Advanced
- [x] 2FA TOTP (Google Authenticator) — setup + verify
- [x] Prisma schema: thêm `twoFactorSecret`, `isTwoFactorEnabled`

### Email System
- [x] Resend API integration
- [x] Mail templates (order receipt, daily report, low stock alert)
- [x] Mail Center UI — inbox/sent/starred/trash/spam
- [x] Mail compose modal

---

## ✅ Phase 4: PWA + Print + Hotkeys + Excel — HOÀN THÀNH

### Feature 1: POS Hotkeys
- [x] Hook `useHotkeys.ts` (map phím → handler, cleanup on unmount)
- [x] F2 → focus search, F9 → payment modal, F12 → clear cart
- [x] Enter → confirm payment, Esc → close modal

### Feature 2: Xuất Excel (.xlsx)
- [x] Cài `exceljs` + `file-saver`
- [x] `exportToExcel.ts` — theme styling, autoWidth, freeze row 1
- [x] `exportRevenueToExcel` — sheet báo cáo doanh thu
- [x] `exportFinanceToExcel` — sheet giao dịch + sheet tổng kết
- [x] `exportProductsToXlsx` — danh sách sản phẩm

### Feature 3: PWA / Offline Mode
- [x] `@ducanh2912/next-pwa` + Workbox config
- [x] `manifest.json` (name, icons, theme_color violet)
- [x] PWA icon (túi market + biểu đồ, tone violet #7c3aed)
- [x] `OfflineBanner.tsx` — tự ẩn sau 3s khi online lại

### Feature 4: In hóa đơn nhiệt (QZ Tray)
- [x] Hook `useThermalPrinter.ts` (WebSocket QZ Tray + fallback browser)
- [x] `receipt.utils.ts` — ESC/POS builder, 58mm/80mm/custom
- [x] `receipt-modal.tsx` — QZ mode + fallback mode
- [x] Settings > Receipt — chọn máy in, khổ giấy, test print

---

## ✅ Hotfixes Sau Phase 4 — HOÀN THÀNH

- [x] **HF-1: CSV delimiter** — đổi `,` → `\t` (tab) cho Mac Numbers compat
  - Files: `reports/page.tsx`, `finance/page.tsx`
- [x] **HF-2: CSV field mapping** — fix `total`, `payments[0].method`, thêm `PAYMENT_METHOD_LABELS`
- [x] **HF-3: Finance Excel sheet trống** — expose `rawOrders`, truyền vào `exportFinanceToExcel`
- [x] **HF-4: Excel theme tối** — redesign sang light theme (white/lavender rows, slate-900 text)
- [x] **HF-5: Mail Center hardcode dark** — rewrite toàn bộ dùng CSS variables
- [x] **HF-6: Mail iframe nền đen** — inject `<!DOCTYPE html>` + `color-scheme: light !important` vào `srcDoc`

---

## 🟡 Tồn Đọng (Không Block Production)

- [ ] **Prisma linting** — `twoFactorSecret`, `isTwoFactorEnabled`, `emailLog` chưa sync client
  - Fix: `cd api && npx prisma migrate dev && npx prisma generate`
- [ ] **QZ Tray** — Cần cài Java + QZ Tray desktop app trên máy thu ngân thật
- [ ] **VNPay/MoMo gateway sandbox** — Test end-to-end qua ngrok

---

## 💡 Backlog — Chưa Lên Kế Hoạch

- [ ] Loyalty points (tích điểm theo đơn, đổi điểm giảm giá)
- [ ] Báo cáo lợi nhuận theo từng sản phẩm
- [ ] App mobile (React Native/Expo)
- [ ] VNPay/MoMo production keys + live test
- [ ] Dashboard realtime (WebSocket live doanh thu)
- [ ] Multi-store management (nhiều cửa hàng 1 tài khoản)
