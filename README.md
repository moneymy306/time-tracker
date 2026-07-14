# Time Tracker

ระบบลงเวลาทำงานส่วนตัว — ลงเวลาเข้า/ออกงาน, จัดการวันลา (พักร้อน/ลากิจ/ลาป่วย),
คำนวณ OT อัตโนมัติจากเวลาที่ทำเกิน, เบิกใช้ OT ที่สะสมไว้, และดูสรุปผ่านปฏิทิน/รายงาน

ไม่มี backend — ข้อมูลทั้งหมดเก็บใน **localStorage ของเบราว์เซอร์** บนเครื่อง/เบราว์เซอร์ที่ใช้งานเท่านั้น

## โครงสร้างไฟล์

**ไฟล์ทั้งหมดอยู่ระดับเดียวกัน ไม่มีโฟลเดอร์ย่อย** เพื่อให้อัปโหลดขึ้น GitHub ผ่านหน้าเว็บได้ง่าย
(ลากไฟล์ทั้งหมดเข้าไปพร้อมกันได้เลย ไม่ต้องกังวลเรื่องโฟลเดอร์ตกหล่น)

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
├── style.css
├── storage.js            # localStorage wrapper
├── config.js             # ค่าเริ่มต้น + โหลด holiday.json
├── app.js                # utils วันที่ + navigation + toast
├── attendance.js
├── leave.js
├── ot.js
├── calendar.js
├── report.js
├── holiday.json          # วันหยุดราชการ (แก้ไขได้เอง)
├── manifest.json         # ทำให้ติดตั้งเป็น PWA บนมือถือได้
├── logo.png              # โลโก้ (ใส่เองได้ ถ้าไม่มีไฟล์นี้จะซ่อนอัตโนมัติ ไม่ error)
└── .nojekyll
```

## รันบนเครื่องตัวเอง

ไม่ต้อง build อะไร เปิดไฟล์ผ่าน local server เฉยๆ (ต้องใช้ server เพราะ `fetch('holiday.json')`
ใช้ไม่ได้ถ้าเปิดไฟล์ตรงๆ แบบ `file://`):

```bash
# python
python3 -m http.server 8080

# หรือ node
npx serve .
```

แล้วเปิด `http://localhost:8080`

## Deploy ขึ้น GitHub Pages

### วิธีที่ 1: อัปโหลดผ่านหน้าเว็บ (ง่ายที่สุด)

1. เข้า repo บน GitHub → **Add file → Upload files**
2. เลือกไฟล์ทั้งหมด (Ctrl+A ในหน้าต่างไฟล์ที่แตก zip ไว้) แล้วลากเข้าไปในหน้าอัปโหลดทีเดียว —
   เนื่องจากไม่มีโฟลเดอร์ย่อยแล้ว จึงไม่มีปัญหาไฟล์ตกหล่น
3. เลื่อนลง กด **Commit changes**
4. เข้า **Settings → Pages → Source: Deploy from a branch → Branch: main / (root) → Save**
5. รอ 1-2 นาที เปิด `https://<username>.github.io/<repo-name>/`

### วิธีที่ 2: Git command line

```bash
cd time-tracker   # โฟลเดอร์ที่มี index.html อยู่ตรงนั้นเลย
git init
git add .
git commit -m "init time tracker"
git branch -M main
git remote add origin https://github.com/<username>/<repo-name>.git
git push -u origin main
```

## ข้อควรทราบ

- **ข้อมูลอยู่เฉพาะเบราว์เซอร์ที่ใช้งาน** — ถ้าเปลี่ยนเครื่อง เปลี่ยนเบราว์เซอร์ หรือล้าง site data ข้อมูลจะหายไป (ระบบนี้ไม่มี export/import และไม่มี backend)
- แก้ไขวันหยุดราชการได้ที่ `holiday.json`
- แก้เวลาทำงาน / สิทธิ์วันลา / กฎ OT ได้ที่หน้า **ตั้งค่า** ภายในแอพ
- OT จะถูกคำนวณอัตโนมัติเมื่อกด "ลงเวลาออกงาน" หลังเวลาเลิกงานเกินกว่าที่ตั้งไว้ (ปัดเศษลงตามนาทีที่กำหนด) และจะหมดอายุถ้าไม่ถูกใช้ภายในจำนวนวันที่ตั้งไว้
- ถ้าต้องการใส่โลโก้ ให้อัปโหลดไฟล์ชื่อ `logo.png` เพิ่มเข้าไปในระดับเดียวกับ `index.html`
