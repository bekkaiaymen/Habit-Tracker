# ⚡ دليل الإعداد السريع لـ Google Sheets

## 🎯 في 5 خطوات فقط:

### 1️⃣ أنشئ Google Sheet
- اذهب إلى: https://sheets.google.com
- أنشئ جدول جديد

### 2️⃣ افتح Apps Script
- القائمة: Extensions > Apps Script

### 3️⃣ انسخ الكود
- افتح ملف `google-script.js`
- انسخ كل محتواه
- الصقه في Apps Script
- احفظ (Ctrl+S)

### 4️⃣ انشر كـ Web App
- Deploy > New deployment
- اختر: Web app
- Execute as: **Me**
- Who has access: **Anyone**
- Deploy
- امنح الأذونات المطلوبة
- **انسخ الرابط** الذي يظهر

### 5️⃣ أضف الرابط
- افتح `google-sheets-db.js`
- ابحث عن:
```javascript
const SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
```
- استبدلها بالرابط الذي نسخته:
```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/xxxxxxx/exec';
```
- احفظ الملف

## ✅ انتهى! 

افتح `index.html` وابدأ الاستخدام.

---

**ملاحظة**: إذا لم تُعد Google Sheets، سيعمل التطبيق تلقائياً بـ localStorage.