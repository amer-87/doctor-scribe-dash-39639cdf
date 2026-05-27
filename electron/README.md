# تطبيق سطح المكتب — Electron

هذا المجلد يحتوي على ملفات تغليف التطبيق كنسخة سطح مكتب محلية قابلة للتثبيت.

## كيف يعمل
نافذة Electron تفتح التطبيق من خادم محلي مضمّن يدعم SSR، ويحمّل صفحات الإنتاج وملفات الأصول من `dist/server` و `dist/client`.
هذا يضمن أن التطبيق يعمل داخل النافذة الأصلية بدلاً من محاولة تحميل ملف HTML ثابت غير موجود.

كل وظائف التطبيق تعمل كما هي: المصادقة، Realtime، الوصفات، PDF، QR Code.

## أوامر التشغيل (على جهازك بنظام Windows داخل VS Code أو Terminal)

```bash
# 1) تثبيت الاعتماديات (مرة واحدة)
npm install

# 2) بناء التطبيق ثم تشغيله داخل Electron
npm run electron:dev

# 3) بناء نسخة Windows قابلة للتثبيت (مجلد + ملف exe)
npm run electron:build:win

# 4) بناء Installer (.exe setup) عبر electron-builder
npm run electron:installer:win
```

بعد التنفيذ:
- `npm run electron:build:win` → ينتج مجلد `electron-release/ClinicApp-win32-x64/` يحتوي `ClinicApp.exe`
- `npm run electron:installer:win` → ينتج setup قابل للتوزيع داخل `electron-release/`

## استخدام رابط خارجي عند الحاجة
إذا أردت تشغيل التطبيق مرة واحدة ضد خادم خارجي بدل النسخة المحلية، اضبط متغير البيئة `APP_URL` قبل التشغيل:

```bash
APP_URL=https://example.com npm run electron:dev
```

## أيقونة التطبيق
يتم استخدام أيقونة `public/icon-512.png` افتراضيًا.
