# Sokxay One Plus — Issue Tracker

## ⚡ วิธีรัน Project

### 1. ติดตั้ง dependencies
```bash
npm install
# หรือ
pnpm install
```

### 2. ตั้งค่า Firebase (สำคัญมาก!)

เปิดไฟล์ `.env.local` แล้วใส่ค่าจาก Firebase Console:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-preset
```

**วิธีหาค่า:** Firebase Console → Project Settings → Your Apps → Web

### 3. สร้าง Admin user ใน Firebase

ไปที่ Firebase Console → Authentication → Add user → ใส่ email/password

จากนั้นไปที่ Firestore → collection `users` → สร้าง document ใหม่ โดย document ID = UID ของ user ที่สร้าง:
```json
{
  "email": "admin@yourdomain.com",
  "displayName": "Admin",
  "isAdmin": true,
  "active": true,
  "permissions": {},
  "createdAt": (server timestamp)
}
```

### 4. รัน dev server
```bash
npm run dev
```

เปิด http://localhost:3000 → จะ redirect ไป /login อัตโนมัติ

---

## 🔧 สิ่งที่แก้ไขใน version นี้

### ปัญหา: เข้าไม่ได้ / ปิด user ไม่ทำงาน

**ต้นเหตุ:** `authContext.tsx` เดิมอ่าน profile แค่ครั้งเดียวตอน login
ทำให้ถ้า admin ปิด user account, user ยังค้าง session อยู่จนกว่าจะ refresh เอง

**แก้ไข:**
- เพิ่ม `onSnapshot` listener บน Firestore document ของ user ที่ login อยู่
- ถ้า `active = false` → `signOut()` อัตโนมัติทันที ไม่ต้อง refresh
- ถ้า permissions เปลี่ยน → update state ทันทีแบบ realtime

### ปัญหา: login page ไม่ redirect ถ้า login อยู่แล้ว

**แก้ไข:** เพิ่ม `useEffect` ใน login page ตรวจสอบ auth state ก่อน แล้ว redirect ไป dashboard

### ปัญหา: AppShell loop redirect

**แก้ไข:** ปรับ logic ใน AppShell ให้ handle case `/login` ถูกต้องทุก state

---

## 📁 โครงสร้างไฟล์สำคัญ

```
src/
├── app/
│   ├── login/page.tsx       ← หน้า Login
│   ├── dashboard/page.tsx   ← Dashboard
│   ├── issues/page.tsx      ← รายงานบัญหา
│   └── admin/
│       ├── users/page.tsx   ← จัดการ Users
│       └── menus/page.tsx   ← จัดการ Menus
├── components/
│   ├── AppShell.tsx         ← Layout wrapper + auth guard
│   ├── Sidebar.tsx
│   └── Navbar.tsx
└── lib/
    ├── authContext.tsx      ← Auth state (realtime)  ← แก้ไขแล้ว
    ├── authService.ts       ← Firebase Auth + Firestore CRUD
    └── firebase.ts          ← Firebase config
```
