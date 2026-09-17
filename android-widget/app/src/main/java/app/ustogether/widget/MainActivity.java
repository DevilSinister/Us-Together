package app.ustogether.widget;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkRequest;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private TextView status, pushStatus;
    private EditText email, password;
    private Button signIn, refresh, signOut;
    private ConnectivityManager manager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private boolean pushConfigured;

    private TextView label(String text, int size, int color) {
        TextView view = new TextView(this);
        view.setText(text); view.setTextSize(size); view.setTextColor(color);
        view.setPadding(0, 8, 0, 8); return view;
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL); page.setPadding(28, 40, 28, 28);
        page.setBackgroundColor(Color.rgb(251, 247, 243));
        page.addView(label("Us Together", 30, Color.rgb(111, 23, 48)));
        page.addView(label("Drawing widget", 22, Color.rgb(47, 37, 39)));
        page.addView(label("Sign in with your existing account. Your partner's newest drawing will appear on your home screen.", 16, Color.rgb(84, 43, 52)));
        email = new EditText(this); email.setHint("Email"); email.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        password = new EditText(this); password.setHint("Password"); password.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        page.addView(email); page.addView(password);
        signIn = new Button(this); signIn.setText("Sign in"); page.addView(signIn);
        refresh = new Button(this); refresh.setText("Refresh drawing"); page.addView(refresh);
        signOut = new Button(this); signOut.setText("Sign out and clear drawing"); page.addView(signOut);
        status = label("", 15, Color.rgb(84, 43, 52)); status.setGravity(Gravity.START); page.addView(status);
        pushStatus = label("", 14, Color.rgb(84, 43, 52)); page.addView(pushStatus);
        setContentView(page);
        pushConfigured = ((WidgetApplication) getApplication()).pushConfigured();
        updateControls();
        if (!pushConfigured) pushStatus.setText("Push setup is unavailable on this build; manual refresh still works.");
        else worker.execute(() -> {
            boolean ready = DrawingApi.pushServerConfigured();
            runOnUiThread(() -> pushStatus.setText(ready ? "Push updates are configured. Android may delay delivery." : "Server push delivery is not configured; use Refresh drawing."));
        });
        signIn.setOnClickListener(view -> {
            String enteredEmail = email.getText().toString();
            String enteredPassword = password.getText().toString();
            work(() -> {
                DrawingApi.signIn(this, enteredEmail, enteredPassword);
                DrawingRefreshJob.schedule(this);
                registerPush();
                return DrawingApi.refreshLatest(this);
            });
        });
        refresh.setOnClickListener(view -> work(() -> DrawingApi.refreshLatest(this)));
        signOut.setOnClickListener(view -> work(() -> {
            DrawingApi.unregisterDevice(this);
            SessionStore.clear(this);
            DrawingWidget.clearImage(this);
            DrawingWidget.renderAll(this);
            DrawingRefreshJob.cancel(this);
            return "Signed out. The cached drawing has been cleared.";
        }));
        if (!DrawingApi.configured()) status.setText("Widget setup is incomplete. Add the public app settings to the Android build.");
        else if (SessionStore.load(this) != null) work(() -> { registerPush(); return DrawingApi.refreshLatest(this); });
        else if (!pushConfigured) status.setText("Push updates are not configured. You can still refresh when signed in.");
    }
    private void registerPush() {
        if (!pushConfigured) return;
        FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token ->
            worker.execute(() -> { try { DrawingApi.registerDevice(this, token); } catch (Exception ignored) {} }));
    }
    private interface Job { String run() throws Exception; }
    private void work(Job job) {
        signIn.setEnabled(false); refresh.setEnabled(false); signOut.setEnabled(false);
        status.setText("Working...");
        worker.execute(() -> {
            String result;
            try { result = job.run(); }
            catch (Exception error) { result = error.getMessage() == null ? "Try again when connected." : error.getMessage(); }
            String text = result;
            runOnUiThread(() -> { status.setText(text); updateControls(); });
        });
    }
    private void updateControls() {
        boolean signed = SessionStore.load(this) != null;
        email.setVisibility(signed ? View.GONE : View.VISIBLE);
        password.setVisibility(signed ? View.GONE : View.VISIBLE);
        signIn.setVisibility(signed ? View.GONE : View.VISIBLE);
        refresh.setVisibility(signed ? View.VISIBLE : View.GONE);
        signOut.setVisibility(signed ? View.VISIBLE : View.GONE);
        signIn.setEnabled(DrawingApi.configured()); refresh.setEnabled(signed); signOut.setEnabled(signed);
    }
    @Override protected void onStart() {
        super.onStart();
        manager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override public void onAvailable(Network network) {
                if (SessionStore.load(MainActivity.this) != null)
                    worker.execute(() -> { try { DrawingApi.refreshLatest(MainActivity.this); } catch (Exception ignored) {} });
            }
        };
        manager.registerNetworkCallback(new NetworkRequest.Builder().build(), networkCallback);
    }
    @Override protected void onStop() {
        if (manager != null && networkCallback != null) manager.unregisterNetworkCallback(networkCallback);
        super.onStop();
    }
    @Override protected void onDestroy() { worker.shutdown(); super.onDestroy(); }
}
