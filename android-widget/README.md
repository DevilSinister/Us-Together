# Us Together for Android

One APK, package `app.ustogether`, that both partners sideload. It has two halves:

- **The app** is the deployed web app opened as a Trusted Web Activity. Chrome renders it full screen, shares its cookie jar, and hides the URL bar once `/.well-known/assetlinks.json` on the web origin names this package and the release signing key. Sign in there exactly as on the web.
- **The native side** holds its own Supabase session so the phone can show the latest received drawing on a home-screen widget, keep an offline drawing outbox, and ring for partner updates through Firebase Cloud Messaging. Reach it by long-pressing the launcher icon and choosing **Widget & notifications**, or from the widget itself. You sign in there once, separately from the app; the two sessions are not bridged on purpose.

Push is dispatched by the database (`fcm_deliveries`, migration `20260920100500`) through the `fcm-dispatch` Edge Function, so a drawing sent from the web or from the native editor rings the other phone the same way. The device token in `drawing_devices` is the opt-in; signing out deletes it.

## Build variables

Everything comes from the shell at Gradle configure time. Nothing here goes into git.

| Variable | Purpose |
| --- | --- |
| `WIDGET_SUPABASE_URL`, `WIDGET_SUPABASE_PUBLISHABLE_KEY` | Public Supabase client settings for the native session, widget and outbox. |
| `WIDGET_WEB_BASE_URL` | The https origin of the deployed web app. It is the Trusted Web Activity launch origin, the notification deep-link base and the asset-statement site. Required for a release build. |
| `WIDGET_FIREBASE_APP_ID`, `WIDGET_FIREBASE_SENDER_ID`, `WIDGET_FIREBASE_API_KEY`, `WIDGET_FIREBASE_PROJECT_ID` | Public Firebase Android app values, read from `google-services.json` (`client[0].client_info.mobilesdk_app_id`, `project_info.project_number`, `client[0].api_key[0].current_key`, `project_info.project_id`). Omit all four for a build without push; the widget then refreshes on open, reconnection and a 15-minute job. |
| `WIDGET_KEYSTORE_PATH`, `WIDGET_KEYSTORE_PASSWORD`, `WIDGET_KEY_ALIAS`, `WIDGET_KEY_PASSWORD` | Release signing. Debug builds use the default debug key and will not verify asset links. |

The service-account JSON for FCM is **never** a build variable: it is the `FIREBASE_SERVICE_ACCOUNT_JSON` secret of the `fcm-dispatch` Edge Function, next to `PUSH_DISPATCH_SECRET`. The Vault secret `fcm_endpoint_url` turns the database worker on.

## Building

Use JDK 17 and the bundled Gradle 8.14 wrapper. From this directory:

```
.\gradlew.bat :app:assembleDebug :app:lintDebug :app:testDebugUnitTest
.\gradlew.bat :app:assembleRelease
```

Debug output: `app/build/outputs/apk/debug/app-debug.apk`. Release output: `app/build/outputs/apk/release/app-release.apk`. Install either directly on a phone; neither is a Play release.

### Release keystore and asset links

```
keytool -genkeypair -v -storetype PKCS12 -keystore C:\keys\us-together-release.jks -alias ustogether -keyalg RSA -keysize 2048 -validity 10000
keytool -list -v -storetype PKCS12 -keystore C:\keys\us-together-release.jks -alias ustogether
```

Copy the `SHA256:` fingerprint into `public/.well-known/assetlinks.json` in the web project and deploy it. On the phone, `adb shell pm get-app-links app.ustogether` should report `verified`. Back the keystore up; losing it means re-signing and republishing the asset links.

## What the native side does

- Widget: latest received drawing, "From your partner · 2 h ago" caption (never a display name), a **Draw back** button that opens the native editor, a **Refresh** button, and a tap that opens the cached drawing offline. It scales to the cell the launcher gives it and re-renders when resized.
- Notifications: every partner-update row reaches every registered device as a content-free data message; the app shows the generic title and opens the app at the target page. Drawings are high priority so the widget refreshes even in Doze.
- Editor and outbox: the nine-tool native editor saves a local draft and queues PNGs per account; a sync sends what it can, sets a permanently invalid file aside as `<id>.failed.png`, and leaves transient failures for the next attempt.
- Sign-out unregisters the FCM token, then clears the session, the outbox, the cached drawing, the inbox cache and the widget.

## Not verified on this machine

No Android device or emulator is attached to the build machine. Compilation, lint and the JVM unit tests run here and in CI; installing, the Trusted Web Activity verification, end-to-end push delivery, widget rendering at real sizes and offline behaviour are checked on the owner's phones and recorded in `docs/DRAWING_NOTES_VERIFICATION.md`.
