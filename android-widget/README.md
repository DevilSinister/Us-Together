# Android drawing widget

This is the minimal Android companion for the existing web app. It signs into the same Supabase account, reads only received finished drawings through RLS, and keeps the latest image in app-private storage. A widget tap opens the drawing in the web app. It never includes drawing content in a push message.

## Configure

Use Android Studio or JDK 17 and the included Gradle 8.14 wrapper. Set these build environment variables before building:

- WIDGET_SUPABASE_URL and WIDGET_SUPABASE_PUBLISHABLE_KEY: public Supabase client config matching the web app.
- WIDGET_WEB_BASE_URL: HTTPS origin of the web app. The companion opens this on widget tap.
- WIDGET_FIREBASE_APP_ID, WIDGET_FIREBASE_SENDER_ID, WIDGET_FIREBASE_API_KEY, WIDGET_FIREBASE_PROJECT_ID: public Firebase Android app config. Omit all four to build a companion without background push; the app shows that push is unavailable and still refreshes on app open, reconnection, manual request and an Android-managed periodic job.

Do not commit service-account JSON, a signing key, or a private hosted URL. Build with `.\\gradlew.bat :app:assembleDebug` from this directory; install the generated debug APK directly on a test device. The debug APK is for private testing, not Play distribution. The web origin must already serve `/drawings/{id}`; an APK cannot deploy that web route. Set `FIREBASE_SERVICE_ACCOUNT_JSON` and `SUPABASE_SECRET_KEY` only on the web server for content-free FCM wakeups. The device token stays in the RLS-protected `drawing_devices` table.

The app uses Supabase email/password sign-in. Sign-out unregisters the FCM token before clearing its encrypted session and cached image. If the unregister call fails, sign-out reports the failure so the user can retry. Android may delay normal-priority data messages in Doze; the widget also refreshes at app open and through a network-constrained periodic job. Without Firebase, the periodic minimum is 15 minutes and Android may defer it further; Supabase Realtime by itself cannot wake a stopped app to update a home-screen widget.
