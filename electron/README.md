# تطبيق سطح المكتب — Electron

هذا المجلد يحتوي على ملفات تغليف التطبيق كنسخة Windows سطح مكتب.

## كيف يعمل
نافذة Electron تفتح موقعك المنشور على `https://doctor-scribe-dash.lovable.app`
داخل نافذة أصلية، مع جلسة محفوظة (Supabase auth يبقى مسجلاً بين الجلسات)،
ودعم كامل لتكبير/تصغير/إغلاق النافذة.

كل وظائف التطبيق تعمل كما هي: المصادقة، Realtime، الوصفات، PDF، QR Code.

## أوامر التشغيل (على جهازك بنظام Windows داخل VS Code أو Terminal)

```bash
# 1) تثبيت الاعتماديات (مرة واحدة)
npm install

# 2) تشغيل التطبيق محلياً للتجربة
npm run electron:dev

# 3) بناء نسخة Windows قابلة للتثبيت (مجلد + ملف exe)
npm run electron:build:win

# 4) بناء Installer (.exe setup) عبر electron-builder
npm run electron:installer:win
```

بعد التنفيذ:
- `npm run electron:build:win` → ينتج مجلد `electron-release/ClinicApp-win32-x64/` يحتوي `ClinicApp.exe`
- `npm run electron:installer:win` → ينتج setup قابل للتوزيع داخل `electron-release/`

## تغيير الرابط
لو أردت توجيه التطبيق لدومين مخصص، عدّل `APP_URL` في `electron/main.cjs`.

## أيقونة التطبيق
ضع ملف `icon.png` (512×512) و `icon.ico` (للويندوز) داخل مجلد `electron/`.
