package app.ustogether.widget;

import android.app.Application;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

public final class WidgetApplication extends Application {
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
    }
    boolean pushConfigured() { return pushConfigured; }
}
