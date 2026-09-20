/**
 * The Android application id. Digital Asset Links, the Firebase Android app
 * registration and the Trusted Web Activity referrer are all keyed on it, so it is
 * declared once here and asserted against public/.well-known/assetlinks.json.
 */
export const ANDROID_PACKAGE = "app.ustogether";

/** The referrer Chrome sends on the first navigation inside our Trusted Web Activity. */
export const ANDROID_APP_REFERRER = "android-app://" + ANDROID_PACKAGE;
