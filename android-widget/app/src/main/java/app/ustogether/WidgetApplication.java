package app.ustogether;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

public final class WidgetApplication extends Application {
    static final String CHANNEL_PARTNER_UPDATES = "partner_updates";
    private boolean pushConfigured;

    @Override public void onCreate() {
        super.onCreate();
        pushConfigured = !BuildConfig.FIREBASE_APP_ID.isEmpty() &&
            !BuildConfig.FIREBASE_SENDER_ID.isEmpty() &&
            !BuildConfig.FIREBASE_API_KEY.isEmpty() &&
            !BuildConfig.FIREBASE_PROJECT_ID.isEmpty();
        if (pushConfigured && FirebaseApp.getApps(this).isEmpty()) {
            FirebaseOptions options = new FirebaseOptions.Builder()
                .setApplicationId(BuildConfig.FIREBASE_APP_ID).setGcmSenderId(BuildConfig.FIREBASE_SENDER_ID)
                .setApiKey(BuildConfig.FIREBASE_API_KEY).setProjectId(BuildConfig.FIREBASE_PROJECT_ID).build();
            FirebaseApp.initializeApp(this, options);
        }
        // Creating an existing channel is a no-op, so this is safe on every start.
        NotificationChannel channel = new NotificationChannel(CHANNEL_PARTNER_UPDATES,
            getString(R.string.channel_partner_updates), NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription(getString(R.string.channel_partner_updates_description));
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
        NotificationChannel updates = new NotificationChannel(AppUpdates.CHANNEL,
            getString(R.string.channel_app_updates), NotificationManager.IMPORTANCE_DEFAULT);
        updates.setDescription(getString(R.string.channel_app_updates_description));
        getSystemService(NotificationManager.class).createNotificationChannel(updates);
        UpdateCheckJob.schedule(this);
    }

    boolean pushConfigured() { return pushConfigured; }
}
