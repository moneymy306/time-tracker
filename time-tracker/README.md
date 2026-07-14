# Time Tracker

ระบบลงเวลาทำงานส่วนตัว — ลงเวลาเข้า/ออกงาน, จัดการวันลา (พักร้อน/ลากิจ/ลาป่วย),
คำนวณ OT อัตโนมัติจากเวลาที่ทำเกิน, เบิกใช้ OT ที่สะสมไว้, และดูสรุปผ่านปฏิทิน/รายงาน

ไม่มี backend — ข้อมูลทั้งหมดเก็บใน **localStorage ของเบราว์เซอร์** บนเครื่อง/เบราว์เซอร์ที่ใช้งานเท่านั้น

## โครงสร้างโปรเจกต์

```
time-tracker/
├── index.html          # redirect ไปหน้า dashboard
├── dashboard.html       # ภาพรวม + ลงเวลาด่วน
├── attendance.html      # ลงเวลาเข้า-ออก + ประวัติ
├── leave.html           # ยื่นลา + สิทธิ์คงเหลือ + ประวัติ
├── ot-bank.html         # OT คงเหลือ + เบิกใช้ + ประวัติ
├── calendar.html        # ปฏิทินรวมทุกอย่าง
├── report.html          # สรุปรายเดือน (ดูอย่างเดียว)
├── setting.html         # ตั้งค่าเวลางาน/สิทธิ์ลา/กฎ OT
├── css/style.css
├── js/
│   ├── storage.js       # localStorage wrapper
│   ├── config.js        # ค่าเริ่มต้น + โหลด holiday.json
│   ├── app.js            # utils วันที่ + navigation + toast
│   ├── attendance.js
│   ├── leave.js
│   ├── ot.js
│   ├── calendar.js
│   └── report.js
├── data/holiday.json     # วันหยุดราชการ (แก้ไขได้เอง)
├── assets/logo.png       # โลโก้ (ใส่เองได้ ถ้าไม่มีจะซ่อนอัตโนมัติ)
└── manifest.json         # ทำให้ติดตั้งเป็น PWA บนมือถือได้
```

## รันบนเครื่องตัวเอง

ไม่ต้อง build อะไร เปิดไฟล์ผ่าน local server เฉยๆ (ต้องใช้ server เพราะ `fetch('data/holiday.json')`
ใช้ไม่ได้ถ้าเปิดไฟล์ตรงๆ แบบ `file://`):

```bash
# python
python3 -m http.server 8080

# หรือ node
npx serve .
```

แล้วเปิด `http://localhost:8080`

## Deploy ขึ้น GitHub Pages

1. สร้าง repository ใหม่บน GitHub แล้ว push โค้ดทั้งหมดขึ้นไป (branch `main`)

   ```bash
   git init
   git add .
   git commit -m "init time tracker"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo-name>.git
   git push -u origin main
   ```

2. เข้า repo บน GitHub → **Settings → Pages**
3. ที่ **Build and deployment → Source** เลือก **Deploy from a branch**
4. เลือก branch `main` และโฟลเดอร์ `/ (root)` แล้วกด **Save**
5. รอสักครู่ จะได้ลิงก์ประมาณ `https://<username>.github.io/<repo-name>/`

> เปิดผ่านลิงก์นี้ได้เลย ไม่ต้องมี server เพิ่มเติม เพราะ GitHub Pages serve เป็น static file ให้อัตโนมัติ

## ข้อควรทราบ

- **ข้อมูลอยู่เฉพาะเบราว์เซอร์ที่ใช้งาน** — ถ้าเปลี่ยนเครื่อง เปลี่ยนเบราว์เซอร์ หรือล้าง site data ข้อมูลจะหายไป (ระบบนี้ไม่มี export/import และไม่มี backend)
- แก้ไขวันหยุดราชการได้ที่ `data/holiday.json`
- แก้เวลาทำงาน / สิทธิ์วันลา / กฎ OT ได้ที่หน้า **ตั้งค่า** ภายในแอพ
- OT จะถูกคำนวณอัตโนมัติเมื่อกด "ลงเวลาออกงาน" หลังเวลาเลิกงานเกินกว่าที่ตั้งไว้ (ปัดเศษลงตามนาทีที่กำหนด) และจะหมดอายุถ้าไม่ถูกใช้ภายในจำนวนวันที่ตั้งไว้
