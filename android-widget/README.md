# Android drawing widget

This is the native Android migration project. It currently includes Supabase sign-in, the latest-received drawing widget/viewer, and a native drawing editor with pencil, marker, highlighter, airbrush, fill, shapes, eyedropper, eraser, local drafts and offline queued sending. Android retries queued PNGs through the RLS-protected drawing table and private Storage when connected. A widget tap opens the native viewer. Other Us Together features have not been ported, so this APK is not yet the complete app. See [Android offline migration](../docs/ANDROID_OFFLINE_MIGRATION.md).

## Configure

Use Android Studio or JDK 17 and the included Gradle 8.14 wrapper. Set these build environment variables before building:

- WIDGET_SUPABASE_URL and WIDGET_SUPABASE_PUBLISHABLE_KEY: public Supabase client config for the existing shared backend.
- WIDGET_WEB_BASE_URL: optional HTTPS origin used only to check server push status. Android sign-in, widget refresh and native drawing view do not require it.
- WIDGET_FIREBASE_APP_ID, WIDGET_FIREBASE_SENDER_ID, WIDGET_FIREBASE_API_KEY, WIDGET_FIREBASE_PROJECT_ID: public Firebase Android app config. Omit all four to build a companion without background push; the app shows that push is unavailable and still refreshes on app open, reconnection, manual request and an Android-managed periodic job.

Do not commit service-account JSON, a signing key, or a private hosted URL. Build with `.\\gradlew.bat :app:assembleDebug` from this directory; install the generated debug APK directly on a test device. The debug APK is for private testing, not Play distribution. Set `FIREBASE_SERVICE_ACCOUNT_JSON` and `SUPABASE_SECRET_KEY` only on the web server for content-free FCM wakeups. The device token stays in the RLS-protected `drawing_devices` table.

The app uses Supabase email/password sign-in. A first sign-in needs connectivity; after sign-in, the cached received drawing and local drawing draft work offline. Queued drawings sync after reconnection. The native send path still needs a device and two-account acceptance test. Sign-out unregisters the FCM token before clearing its encrypted session and cached image. If the unregister call fails, sign-out reports the failure so the user can retry. Android may delay normal-priority data messages in Doze; the widget also refreshes at app open and through a network-constrained periodic job. Without Firebase, the periodic minimum is 15 minutes and Android may defer it further; Supabase Realtime by itself cannot wake a stopped app to update a home-screen widget.
