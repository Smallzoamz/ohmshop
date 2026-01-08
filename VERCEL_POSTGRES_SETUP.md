# วิธีการตั้งค่า Vercel Postgres

1.  **เข้า Vercel Dashboard**: ไปที่โปรเจกต์ของคุณในเว็บ Vercel
2.  **tab Storage**: คลิกที่แถบ **Storage** ด้านบน
3.  **Create Database**:
    *   เลือก **Postgres** (Vercel Postgres)
    *   ตั้งชื่อ (เช่น `ohmshop-db`)
    *   Region: เลือก `Singapore (sin1)` (ใกล้ไทยที่สุด) หรือ `Washington, D.C. (iad1)`
    *   คลิก **Create**
4.  **Connect Project**:
    *   ด้านซ้ายเลือก **Projects** แล้วกด **Connect** โปรเจกต์นี้
    *   Vercel จะเติม Environment Variables (`POSTGRES_URL`, ฯลฯ) ให้เองอัตโนมัติสำหรับการ Deploy
5.  **สำหรับการรันในเครื่อง (Localhost)**:
    *   ในหน้า Storage กด **.env.local**
    *   กด **Show Secret**
    *   Copy ค่า `POSTGRES_URL="..."` หรือ `DATABASE_URL="..."`
    *   เอามาใส่ในไฟล์ `.env` ในเครื่องของคุณ (เปลี่ยนชื่อตัวแปรเป็น `DATABASE_URL` ให้ตรงกันถ้าจำเป็น)

---
หลังจากทำเสร็จแล้ว ให้รันคำสั่ง:
`npm install`
เพื่อลงตัว `pg` ที่อันอันกำลังจะเพิ่มให้ค่ะ
