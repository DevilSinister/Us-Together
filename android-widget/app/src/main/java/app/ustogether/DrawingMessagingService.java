package app.ustogether;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public final class DrawingMessagingService extends FirebaseMessagingService {
    @Override public void onNewToken(String token) {
        new Thread(() -> {
            try { if (SessionStore.load(this) != null) DrawingApi.registerDevice(this, token); }
            catch (Exception ignored) { /* App open retries registration. */ }
        }, "drawing-token").start();
    }

    @Override public void onMessageReceived(RemoteMessage message) {
        PushEnvelope envelope = PushEnvelope.parse(message.getData(), getString(R.string.app_name));
        if (envelope == null) return;
        // A drawing also refreshes the home-screen widget, whether or not an alert is shown.
        if (envelope.isDrawing()) DrawingRefreshJob.enqueueNow(this);
        // A push that arrives after sign-out belongs to nobody on this phone.
        if (SessionStore.load(this) == null) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null || !manager.areNotificationsEnabled()) return;
        Notification notification = new Notification.Builder(this, WidgetApplication.CHANNEL_PARTNER_UPDATES)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(getColor(R.color.brand))
            .setContentTitle(envelope.title)
            .setContentText(getString(R.string.notification_body_generic))
            .setAutoCancel(true)
            .setContentIntent(openIntent(this, envelope))
            .build();
        // Tag = notification row id, so a retried send replaces the alert instead of stacking one.
        manager.notify(envelope.tag, 0, notification);
    }

    /** Tapping opens the app at the target path; without a web origin, the native setup screen. */
    static PendingIntent openIntent(Context context, PushEnvelope envelope) {
        Intent intent;
        String origin = BuildConfig.WEB_BASE_URL.replaceAll("/+$", "");
        if (origin.startsWith("https://")) {
            intent = new Intent(Intent.ACTION_VIEW, Uri.parse(origin + envelope.targetPath)).setPackage(context.getPackageName());
        } else {
            intent = new Intent(context, MainActivity.class);
            if (envelope.isDrawing()) intent.putExtra(MainActivity.EXTRA_OPEN_DRAWING, true);
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(context, envelope.tag.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
