package app.ustogether.widget;

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
        if (!"drawing".equals(message.getData().get("type"))) return;
        DrawingRefreshJob.enqueueNow(this);
    }
}
