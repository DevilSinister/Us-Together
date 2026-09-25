# Us Together for Android

One APK, package `app.ustogether`, that both partners sideload. It has two halves:

- **The app** is the deployed web app opened as a Trusted Web Activity. Chrome renders it full screen, shares its cookie jar, and hides the URL bar once `/.well-known/assetlinks.json` on the web origin names this package and the release signing key. Sign in there exactly as on the web.
- **The native side** holds its own Supabase session so the phone can show the latest received drawing on a home-screen widget, keep an offline drawing outbox, and ring for partner updates through Firebase Cloud Messaging. Reach it by long-pressing the launcher icon and choosing **Widget & notifications**, or from the widget itself. You sign in there once, separately from the app; the two sessions are not bridged on purpose.

Push is dispatched by the database (`fcm_deliveries`, migration `20260920195802`) through the `fcm-dispatch` Edge Function, so a drawing sent from the web or from the native editor rings the other phone the same way. The device token in `drawing_devices` is the opt-in; signing out deletes it.

## Build variables

Everything comes from the shell at Gradle configure time. Nothing here goes into git.

| Variable | Purpose |
| --- | --- |
| `WIDGET_SUPABASE_URL`, `WIDGET_SUPABASE_PUBLISHABLE_KEY` | Public Supabase client settings for the native session, widget and outbox. |
| `WIDGET_WEB_BASE_URL` | The https origin of the deployed web app. It is the Trusted Web Activity launch origin, the notification deep-link base and the asset-statement site. Required for a release build. |
| `WIDGET_FIREBASE_APP_ID`, `WIDGET_FIREBASE_SENDER_ID`, `WIDGET_FIREBASE_API_KEY`, `WIDGET_FIREBASE_PROJECT_ID` | Public Firebase Android app values, read from `google-services.json` (`client[0].client_info.mobilesdk_app_id`, `project_info.project_number`, `client[0].api_key[0].current_key`, `project_info.project_id`). Omit all four for a build without push; the widget then refreshes on open, reconnection and a 15-minute job. |
| `WIDGET_KEYSTORE_PATH`, `WIDGET_KEYSTORE_PASSWORD`, `WIDGET_KEY_ALIAS`, `WIDGET_KEY_PASSWORD` | Release signing. Debug builds use the default debug key and will not verify asset links. |
| `WIDGET_UPDATE_MANIFEST_URL` | The `update.json` the app checks for a newer release. CI sets it to `https://github.com/<repo>/releases/latest/download/update.json`; empty turns self-update off. Debug builds never check. |
| `WIDGET_VERSION_CODE`, `WIDGET_VERSION_NAME` | Set by CI to `100 + run number` and `0.3.<run number>`. Local builds default to `2` and `0.2.0`, so a hand-built APK never installs over a CI one. |

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
- Notifications: every partner-update row reaches every registered device as a content-free data message. The title is the database's fixed copy saying what happened ("New memory added", "3 new photos added to a memory", "A plan was deleted"), never a user-entered title; a growing photo batch re-sends under the same tag, so the alert updates in place. Tapping opens the app at the target page, or at the inbox when the record was deleted. Drawings are high priority so the widget refreshes even in Doze.
- Editor and outbox: the nine-tool native editor saves a local draft and queues PNGs per account; a sync sends what it can, sets a permanently invalid file aside as `<id>.failed.png`, and leaves transient failures for the next attempt.
- Sign-out unregisters the FCM token, then clears the session, the outbox, the cached drawing, the inbox cache and the widget.

## Updates

Every push to `main` that changes `android-widget/` runs `.github/workflows/android-release.yml`: it builds a release APK signed with your keystore, then publishes `us-together.apk` and `update.json` as a new GitHub release (`android-v<code>`). Pushes that change only the web app need nothing here; Vercel redeploys it and the app, which *is* the web app, shows "A new version is ready".

On the phone:

- **On launch** (a plain tap on the icon, not a notification), if a newer release was found, a dialog asks *Update now* or *Later*. *Later* waits 12 hours before asking again.
- **In the background** the app checks on launch (at most every 30 minutes) and every six hours, and posts one "Update ready" notification per release.
- **Update now** downloads the APK, checks its SHA-256 against the manifest and hands it to Android's package installer. The app closes, the new version installs, and an "Us Together updated" notification reopens it.
- The **first** self-update asks once to allow "Install unknown apps" for Us Together, then shows Android's own "Update this app?" sheet: the app that originally installed the APK is still its installer of record. From then on, on Android 12 and later, updates install without that sheet.
- The widget screen also shows the waiting version with an *Update the app* button.

### One-time setup

The workflow signs with the same keystore as the APK already on the phones. Any other key, including the debug key, produces an update Android refuses to install. From this directory, with `gh` signed in to the repository:

```
.\publish-release-secrets.ps1
```

It dot-sources `set-build-env.local.ps1` (asking for the keystore password as usual) and stores these repository secrets through `gh secret set` on stdin: `WIDGET_SUPABASE_URL`, `WIDGET_SUPABASE_PUBLISHABLE_KEY`, `WIDGET_WEB_BASE_URL`, the four `WIDGET_FIREBASE_*` values if set, `WIDGET_KEYSTORE_PASSWORD`, `WIDGET_KEY_ALIAS`, `WIDGET_KEY_PASSWORD` and `WIDGET_KEYSTORE_BASE64`. Until they exist, the release workflow fails at *Check release secrets*.

Phones running a debug build, or a release signed with another key, need one manual install of a CI release (uninstall first). After that, every release arrives on its own.

Release APKs are public, because the repository is. They contain the web origin and the public Supabase and Firebase client values, which the deployed web app already serves to anyone who opens it; no secret goes into the APK.

## Not verified on this machine

No Android device or emulator is attached to the build machine. Compilation, lint and the JVM unit tests run here and in CI; installing, the Trusted Web Activity verification, end-to-end push delivery, widget rendering at real sizes and offline behaviour are checked on the owner's phones and recorded in `docs/DRAWING_NOTES_VERIFICATION.md`.
