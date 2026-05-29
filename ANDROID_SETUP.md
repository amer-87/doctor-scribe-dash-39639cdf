# تحويل التطبيق إلى Android App عبر Capacitor

دليل كامل خطوة بخطوة لبناء تطبيق Android حقيقي من هذا المشروع.

## المتطلبات على حاسوبك

- [Node.js 20+](https://nodejs.org)
- [Android Studio](https://developer.android.com/studio)
- [Java JDK 17](https://adoptium.net)
- Git

## الخطوات

### 1) انقل الكود إلى حاسوبك

من Lovable: زر **GitHub** → **Connect to GitHub** → استنسخ المستودع.

```bash
git clone https://github.com/<username>/<repo>.git
cd <repo>
npm install
```

### 2) ثبّت Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

> ملف `capacitor.config.ts` موجود مسبقاً في المشروع. عدّل `appId` إلى معرّف فريد لك (مثل `com.yourname.clinic`) قبل المتابعة — لا يمكن تغييره بعد النشر على Google Play.

### 3) ابنِ المشروع وأضف منصة Android

```bash
npm run build
npx cap add android
npx cap sync android
```

### 4) افتح المشروع في Android Studio

```bash
npx cap open android
```

### 5) شغّل التطبيق

- وصّل هاتفك بـ USB (مع **USB debugging** مفعّل)، أو استخدم محاكي.
- اضغط ▶️ **Run** في Android Studio.

### 6) عند كل تحديث للموقع على Lovable

لا تحتاج لإعادة بناء التطبيق! الـ `capacitor.config.ts` يشير إلى `https://clinic-87.lovable.app` — أي تعديل ينشر تلقائياً يظهر في التطبيق فوراً.

تحتاج إعادة بناء فقط عند:
- تغيير `appId` / اسم التطبيق / الأيقونة
- إضافة plugin جديد من Capacitor (كاميرا، إشعارات...)

```bash
git pull
npm run build
npx cap sync android
```

### 7) بناء APK / AAB للنشر

من Android Studio:
- **Build → Generate Signed Bundle / APK**
- اختر **Android App Bundle (.aab)** لـ Google Play
- أنشئ **Keystore** واحفظه في مكان آمن جداً (ستحتاجه لكل تحديث مستقبلي)

## إضافة ميزات الجهاز (اختياري)

```bash
# إشعارات
npm install @capacitor/push-notifications

# كاميرا
npm install @capacitor/camera

# تخزين محلي
npm install @capacitor/preferences

npx cap sync android
```

ثم استخدمها في الكود:
```ts
import { Camera } from '@capacitor/camera';
const photo = await Camera.getPhoto({ quality: 90 });
```

## ملاحظات

- المعرّف `appId` يجب أن يكون فريداً وبصيغة عكسية: `com.yourname.appname`
- احفظ ملف **Keystore** و كلمة المرور — فقدانهما يعني عدم القدرة على تحديث التطبيق على Google Play أبداً
- لاختبار قبل النشر: ثبّت ملف APK مباشرة على هاتفك من Android Studio
