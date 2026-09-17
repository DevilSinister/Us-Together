package app.ustogether.widget;

import android.app.Activity;
import android.annotation.SuppressLint;
import android.os.Build;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.BitmapFactory;
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
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    static final String EXTRA_OPEN_DRAWING = "open_drawing";
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private TextView status, pushStatus;
    private EditText email, password;
    private Button signIn, refresh, signOut, openDrawing, makeDrawing, sendQueued, notifications;
    private LinearLayout homePanel, drawingPanel;
    private ImageView drawingImage;
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
        homePanel = new LinearLayout(this); homePanel.setOrientation(LinearLayout.VERTICAL);
        drawingPanel = new LinearLayout(this); drawingPanel.setOrientation(LinearLayout.VERTICAL);
        homePanel.addView(label("Home", 22, Color.rgb(47, 37, 39)));
        homePanel.addView(label("Sign in to see drawings from your partner and manage your home-screen widget.", 16, Color.rgb(84, 43, 52)));
        email = new EditText(this); email.setHint("Email"); email.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        password = new EditText(this); password.setHint("Password"); password.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        homePanel.addView(email); homePanel.addView(password);
        signIn = new Button(this); signIn.setText("Sign in"); homePanel.addView(signIn);
        makeDrawing = new Button(this); makeDrawing.setText("Make a drawing"); homePanel.addView(makeDrawing);
        openDrawing = new Button(this); openDrawing.setText("View latest drawing"); homePanel.addView(openDrawing);
        sendQueued = new Button(this); sendQueued.setText("Send queued drawings"); homePanel.addView(sendQueued);
        notifications = new Button(this); notifications.setText("Partner updates"); homePanel.addView(notifications);
        refresh = new Button(this); refresh.setText("Refresh drawing"); homePanel.addView(refresh);
        signOut = new Button(this); signOut.setText("Sign out and clear drawing"); homePanel.addView(signOut);
        status = label("", 15, Color.rgb(84, 43, 52)); status.setGravity(Gravity.START); homePanel.addView(status);
        pushStatus = label("", 14, Color.rgb(84, 43, 52)); homePanel.addView(pushStatus);
        drawingPanel.addView(label("Latest drawing", 22, Color.rgb(47, 37, 39)));
        drawingImage = new ImageView(this);
        drawingImage.setAdjustViewBounds(true); drawingImage.setContentDescription("Latest drawing from your partner");
        drawingPanel.addView(drawingImage, new LinearLayout.LayoutParams(-1, 0, 1));
        Button backHome = new Button(this); backHome.setText("Back to Home"); drawingPanel.addView(backHome);
        backHome.setOnClickListener(view -> showHome());
        openDrawing.setOnClickListener(view -> showDrawing());
        notifications.setOnClickListener(view -> startActivity(new Intent(this, NotificationActivity.class)));
        makeDrawing.setOnClickListener(view -> startActivity(new Intent(this, DrawingEditorActivity.class)));
        sendQueued.setOnClickListener(view -> work(() -> {
            int sent = PendingDrawings.sync(this);
            return sent == 0 ? "No drawings waiting to send." : sent + " drawing(s) sent.";
        }));
        page.addView(homePanel, new LinearLayout.LayoutParams(-1, 0, 1));
        page.addView(drawingPanel, new LinearLayout.LayoutParams(-1, 0, 1));
        drawingPanel.setVisibility(View.GONE);
        setContentView(page);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                () -> { if (drawingPanel.getVisibility() == View.VISIBLE) showHome(); else finish(); });
        }
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
        signOut.setOnClickListener(view -> {
            SessionStore.Session current = SessionStore.load(this);
            int waiting = current == null ? 0 : PendingDrawings.count(this, current.userId);
            boolean draftExists = current != null &&
                new java.io.File(getFilesDir(), "drawing-draft-" + current.userId + ".png").exists();
            Runnable confirm = () -> work(() -> {
                DrawingApi.unregisterDevice(this);
                SessionStore.Session active = SessionStore.load(this);
                if (active != null) {
                    PendingDrawings.clear(this, active.userId);
                    DrawingApi.clearNotificationCache(this, active.userId);
                    new java.io.File(getFilesDir(), "drawing-draft-" + active.userId + ".png").delete();
                }
                SessionStore.clear(this);
                DrawingWidget.clearImage(this);
                DrawingWidget.renderAll(this);
                DrawingRefreshJob.cancel(this);
                return "Signed out. Local drawings have been cleared.";
            });
            if (waiting > 0 || draftExists) new android.app.AlertDialog.Builder(this)
                .setMessage(waiting + " drawing(s) are waiting to send" +
                    (draftExists ? " and a draft is saved" : "") + ". Signing out will discard local drawings.")
                .setNegativeButton("Keep drawings", null)
                .setPositiveButton("Sign out and discard", (dialog, which) -> confirm.run()).show();
            else confirm.run();
        });
        if (getIntent().getBooleanExtra(EXTRA_OPEN_DRAWING, false) && SessionStore.load(this) != null) showDrawing();
        if (!DrawingApi.configured()) status.setText("Widget setup is incomplete. Add the public Supabase settings to the Android build.");
        else if (SessionStore.load(this) != null) work(() -> { registerPush(); return DrawingApi.refreshLatest(this); });
        else if (!pushConfigured) status.setText("Push updates are not configured. You can still refresh when signed in.");
    }
    private void showHome() {
        drawingPanel.setVisibility(View.GONE);
        homePanel.setVisibility(View.VISIBLE);
    }
    private void showDrawing() {
        if (SessionStore.load(this) == null || !DrawingWidget.imageFile(this).exists()) {
            status.setText("No drawing is stored yet. Refresh when connected.");
            showHome();
            return;
        }
        drawingImage.setImageBitmap(BitmapFactory.decodeFile(DrawingWidget.imageFile(this).getAbsolutePath()));
        homePanel.setVisibility(View.GONE);
        drawingPanel.setVisibility(View.VISIBLE);
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent.getBooleanExtra(EXTRA_OPEN_DRAWING, false)) showDrawing();
    }
    @SuppressLint("GestureBackNavigation")
    @Override public void onBackPressed() {
        if (drawingPanel.getVisibility() == View.VISIBLE) showHome();
        else super.onBackPressed();
    }
    private void registerPush() {
        if (!pushConfigured) return;
        FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token ->
            worker.execute(() -> { try { DrawingApi.registerDevice(this, token); } catch (Exception ignored) {} }));
    }
    private interface Job { String run() throws Exception; }
    private void work(Job job) {
        signIn.setEnabled(false); refresh.setEnabled(false); signOut.setEnabled(false);
        makeDrawing.setEnabled(false); sendQueued.setEnabled(false); openDrawing.setEnabled(false); notifications.setEnabled(false);
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
        makeDrawing.setVisibility(signed ? View.VISIBLE : View.GONE);
        sendQueued.setVisibility(signed ? View.VISIBLE : View.GONE);
        sendQueued.setText(signed ? "Send queued drawings (" + PendingDrawings.count(this, SessionStore.load(this).userId) + ")" : "Send queued drawings");
        notifications.setVisibility(signed ? View.VISIBLE : View.GONE);
        openDrawing.setVisibility(signed && DrawingWidget.imageFile(this).exists() ? View.VISIBLE : View.GONE);
        refresh.setVisibility(signed ? View.VISIBLE : View.GONE);
        signOut.setVisibility(signed ? View.VISIBLE : View.GONE);
        signIn.setEnabled(DrawingApi.configured()); makeDrawing.setEnabled(signed);
        sendQueued.setEnabled(signed); notifications.setEnabled(signed); openDrawing.setEnabled(signed); refresh.setEnabled(signed); signOut.setEnabled(signed);
    }
    @Override protected void onStart() {
        super.onStart();
        updateControls();
        manager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override public void onAvailable(Network network) {
                if (SessionStore.load(MainActivity.this) != null)
                    worker.execute(() -> {
                        try { PendingDrawings.sync(MainActivity.this); } catch (Exception ignored) {}
                        try { DrawingApi.refreshLatest(MainActivity.this); } catch (Exception ignored) {}
                        runOnUiThread(MainActivity.this::updateControls);
                    });
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
