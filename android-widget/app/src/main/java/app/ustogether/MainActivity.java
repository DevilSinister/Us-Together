package app.ustogether;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.NotificationManager;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkRequest;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import com.google.firebase.messaging.FirebaseMessaging;
import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * The native "Widget & notifications" screen. The app itself is the web app in a Trusted
 * Web Activity; this screen exists so the phone can hold its own session for the
 * home-screen widget, the offline outbox and push notifications.
 */
public final class MainActivity extends Activity {
    static final String EXTRA_OPEN_DRAWING = "open_drawing";
    static final String EXTRA_ACTION = "action";
    static final String ACTION_DRAW = "draw";
    private static final int REQUEST_NOTIFICATIONS = 41;

    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private TextView status, pushStatus, notificationStatus;
    private EditText email, password;
    private Button signIn, refresh, signOut, openDrawing, makeDrawing, sendQueued, notifications, openApp, notificationAction;
    private LinearLayout homePanel, drawingPanel, updatePanel;
    private TextView updateText;
    private ImageView drawingImage;
    private ConnectivityManager manager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private boolean pushConfigured;

    private TextView label(int styleRes, int stringRes) { return Ui.text(this, styleRes, stringRes); }
    private TextView label(int styleRes) { return Ui.text(this, styleRes, ""); }
    private Button button(int styleRes, int stringRes) { return Ui.button(this, styleRes, stringRes); }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        ScrollView scroll = new ScrollView(this);
        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        int gutter = Ui.dp(this, R.dimen.gutter_page);
        page.setPadding(gutter, Ui.dp(this, R.dimen.space_10), gutter, Ui.dp(this, R.dimen.space_8));
        page.setBackgroundColor(getColor(R.color.background));

        // An eyebrow over a serif headline, the way every page on the web opens.
        page.addView(label(R.style.Text_Eyebrow, R.string.setup_eyebrow));
        page.addView(Ui.spaced(this, label(R.style.Text_Display, R.string.setup_heading), R.dimen.space_2));

        homePanel = new LinearLayout(this); homePanel.setOrientation(LinearLayout.VERTICAL);
        drawingPanel = new LinearLayout(this); drawingPanel.setOrientation(LinearLayout.VERTICAL);

        homePanel.addView(Ui.spaced(this, label(R.style.Text_Lede, R.string.setup_intro), R.dimen.space_4));

        // Shown only while a newer release is waiting; the launcher asks too, this is the calm path.
        updatePanel = Ui.panel(this);
        updateText = label(R.style.Text_Body);
        updatePanel.addView(updateText);
        Button updateAction = button(R.style.Widget_UsTogether_Button_Primary, R.string.setup_update_action);
        updateAction.setOnClickListener(view -> startActivity(UpdateActivity.intent(this, true)));
        updatePanel.addView(Ui.spaced(this, updateAction, R.dimen.space_3));
        updatePanel.setVisibility(View.GONE);
        homePanel.addView(Ui.spaced(this, updatePanel, R.dimen.space_5));

        email = Ui.field(this, R.string.setup_email, InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        password = Ui.field(this, R.string.setup_password, InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        homePanel.addView(Ui.spaced(this, email, R.dimen.space_5));
        homePanel.addView(Ui.spaced(this, password, R.dimen.space_3));
        email.setImeOptions(EditorInfo.IME_ACTION_NEXT);
        password.setImeOptions(EditorInfo.IME_ACTION_DONE);

        signIn = button(R.style.Widget_UsTogether_Button_Primary, R.string.setup_sign_in);
        // The keyboard's Done key signs in, so nobody has to dismiss it to find the button.
        password.setOnEditorActionListener((view, actionId, event) -> {
            if (actionId != EditorInfo.IME_ACTION_DONE || !signIn.isEnabled()) return false;
            signIn.performClick();
            return true;
        });
        homePanel.addView(Ui.spaced(this, signIn, R.dimen.space_4));

        // One dominant next step rather than nine controls of equal weight.
        makeDrawing = button(R.style.Widget_UsTogether_Button_Primary, R.string.setup_make_drawing);
        homePanel.addView(Ui.spaced(this, makeDrawing, R.dimen.space_5));
        openDrawing = button(R.style.Widget_UsTogether_Button_Outline, R.string.setup_view_latest);
        homePanel.addView(Ui.spaced(this, openDrawing, R.dimen.space_2));
        refresh = button(R.style.Widget_UsTogether_Button_Outline, R.string.setup_refresh);
        homePanel.addView(Ui.spaced(this, refresh, R.dimen.space_2));

        // Partner updates reads as a destination, so it takes the quiet blush
        // navigation treatment the web sidebar uses for an active section.
        notifications = button(R.style.Widget_UsTogether_Button_Ghost, R.string.setup_partner_updates);
        notifications.setBackgroundResource(R.drawable.bg_nav_row);
        notifications.setGravity(Gravity.CENTER_VERTICAL);
        homePanel.addView(Ui.spaced(this, notifications, R.dimen.space_5));

        // The outbox: shown as its own line so a count is legible, rather than
        // living inside a button label that sits there reading "(0)".
        sendQueued = button(R.style.Widget_UsTogether_Button_Outline, R.string.setup_send_queued);
        homePanel.addView(Ui.spaced(this, sendQueued, R.dimen.space_2));

        LinearLayout notificationGroup = Ui.panel(this);
        notificationStatus = label(R.style.Text_Body);
        notificationStatus.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        notificationGroup.addView(notificationStatus);
        notificationAction = button(R.style.Widget_UsTogether_Button_Ghost, R.string.setup_notifications_allow);
        notificationGroup.addView(Ui.spaced(this, notificationAction, R.dimen.space_2));
        pushStatus = label(R.style.Text_Caption);
        notificationGroup.addView(Ui.spaced(this, pushStatus, R.dimen.space_2));
        homePanel.addView(Ui.spaced(this, notificationGroup, R.dimen.space_5));

        status = label(R.style.Text_Caption);
        status.setGravity(Gravity.START);
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        homePanel.addView(Ui.spaced(this, status, R.dimen.space_4));

        // A quiet foot behind a fine rule, the way the web puts administration last.
        homePanel.addView(Ui.divider(this));
        openApp = button(R.style.Widget_UsTogether_Button_Outline, R.string.setup_open_app);
        homePanel.addView(openApp);
        signOut = button(R.style.Widget_UsTogether_Button_Danger, R.string.setup_sign_out);
        homePanel.addView(Ui.spaced(this, signOut, R.dimen.space_2));

        drawingPanel.addView(label(R.style.Text_Eyebrow, R.string.setup_latest_eyebrow));
        drawingPanel.addView(Ui.spaced(this, label(R.style.Text_Headline, R.string.setup_latest_heading), R.dimen.space_2));
        drawingImage = new ImageView(this);
        drawingImage.setAdjustViewBounds(true);
        drawingImage.setBackgroundResource(R.drawable.shape_panel);
        drawingImage.setClipToOutline(true);
        drawingImage.setContentDescription(getString(R.string.widget_image_description));
        LinearLayout.LayoutParams imageParams = new LinearLayout.LayoutParams(-1, -2);
        imageParams.topMargin = Ui.dp(this, R.dimen.space_5);
        drawingPanel.addView(drawingImage, imageParams);
        Button backHome = button(R.style.Widget_UsTogether_Button_Outline, R.string.setup_back_home);
        drawingPanel.addView(Ui.spaced(this, backHome, R.dimen.space_5));
        backHome.setOnClickListener(view -> showHome());
        openDrawing.setOnClickListener(view -> showDrawing());
        notifications.setOnClickListener(view -> startActivity(new Intent(this, NotificationActivity.class)));
        makeDrawing.setOnClickListener(view -> startActivity(new Intent(this, DrawingEditorActivity.class)));
        openApp.setOnClickListener(view -> {
            Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (launch != null) startActivity(launch);
        });
        sendQueued.setOnClickListener(view -> work(() -> {
            int sent = PendingDrawings.sync(this);
            return sent == 0 ? getString(R.string.setup_no_queue) : getString(R.string.setup_sent_count, sent);
        }));
        notificationAction.setOnClickListener(view -> requestNotifications(true));
        page.addView(homePanel, new LinearLayout.LayoutParams(-1, -2));
        page.addView(drawingPanel, new LinearLayout.LayoutParams(-1, -2));
        drawingPanel.setVisibility(View.GONE);
        scroll.addView(page);
        setContentView(scroll);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                () -> { if (drawingPanel.getVisibility() == View.VISIBLE) showHome(); else finish(); });
        }
        pushConfigured = ((WidgetApplication) getApplication()).pushConfigured();
        pushStatus.setText(pushConfigured ? R.string.setup_push_ready : R.string.setup_push_unavailable);
        updateControls();
        signIn.setOnClickListener(view -> {
            String enteredEmail = email.getText().toString().trim();
            String enteredPassword = password.getText().toString();
            work(() -> {
                DrawingApi.signIn(this, enteredEmail, enteredPassword);
                DrawingRefreshJob.schedule(this);
                registerPush();
                return DrawingApi.refreshLatest(this);
            }, () -> requestNotifications(false));
        });
        refresh.setOnClickListener(view -> work(() -> DrawingApi.refreshLatest(this)));
        signOut.setOnClickListener(view -> confirmSignOut());
        if (!DrawingApi.configured()) status.setText(R.string.setup_not_configured);
        else if (SessionStore.load(this) != null) work(() -> { registerPush(); return DrawingApi.refreshLatest(this); });
        handleIntent(getIntent());
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        boolean signed = SessionStore.load(this) != null;
        if (ACTION_DRAW.equals(intent.getStringExtra(EXTRA_ACTION))) {
            if (signed) startActivity(new Intent(this, DrawingEditorActivity.class));
            else status.setText(R.string.setup_intro);
            intent.removeExtra(EXTRA_ACTION);
        } else if (intent.getBooleanExtra(EXTRA_OPEN_DRAWING, false) && signed) {
            showDrawing();
        }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void confirmSignOut() {
        SessionStore.Session current = SessionStore.load(this);
        int waiting = current == null ? 0 : PendingDrawings.count(this, current.userId);
        boolean draftExists = current != null && new File(getFilesDir(), "drawing-draft-" + current.userId + ".png").exists();
        Runnable confirm = () -> work(() -> {
            DrawingApi.unregisterDevice(this);
            SessionStore.Session active = SessionStore.load(this);
            if (active != null) {
                PendingDrawings.clear(this, active.userId);
                DrawingApi.clearNotificationCache(this, active.userId);
                new File(getFilesDir(), "drawing-draft-" + active.userId + ".png").delete();
            }
            SessionStore.clear(this);
            DrawingWidget.clearImage(this);
            DrawingWidget.renderAll(this);
            DrawingRefreshJob.cancel(this);
            getSystemService(NotificationManager.class).cancelAll();
            return getString(R.string.setup_signed_out);
        });
        if (waiting > 0 || draftExists) new AlertDialog.Builder(this)
            .setMessage(getString(R.string.setup_discard_message, waiting, draftExists ? getString(R.string.setup_discard_draft_suffix) : ""))
            .setNegativeButton(R.string.setup_keep_drawings, null)
            .setPositiveButton(R.string.setup_sign_out_discard, (dialog, which) -> confirm.run()).show();
        else confirm.run();
    }

    private boolean notificationsAllowed() {
        NotificationManager notificationManager = getSystemService(NotificationManager.class);
        boolean enabled = notificationManager != null && notificationManager.areNotificationsEnabled();
        if (Build.VERSION.SDK_INT >= 33)
            enabled = enabled && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        return enabled;
    }

    /** The system prompt first (API 33+); when it can no longer be shown, system settings. */
    private void requestNotifications(boolean fromButton) {
        if (notificationsAllowed()) { if (fromButton) openNotificationSettings(); return; }
        if (Build.VERSION.SDK_INT >= 33) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQUEST_NOTIFICATIONS);
            return;
        }
        if (fromButton) openNotificationSettings();
    }

    private void openNotificationSettings() {
        startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName()));
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQUEST_NOTIFICATIONS) return;
        updateControls();
        // A second refusal is permanent from script; only settings can change it now.
        if (!notificationsAllowed() && Build.VERSION.SDK_INT >= 33
            && !shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
            notificationAction.setText(R.string.setup_notifications_settings);
            notificationAction.setOnClickListener(view -> openNotificationSettings());
        }
    }

    private void showHome() {
        drawingPanel.setVisibility(View.GONE);
        homePanel.setVisibility(View.VISIBLE);
    }
    private void showDrawing() {
        if (SessionStore.load(this) == null || !DrawingWidget.imageFile(this).exists()) {
            status.setText(R.string.setup_no_drawing);
            showHome();
            return;
        }
        drawingImage.setImageBitmap(BitmapFactory.decodeFile(DrawingWidget.imageFile(this).getAbsolutePath()));
        homePanel.setVisibility(View.GONE);
        drawingPanel.setVisibility(View.VISIBLE);
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
    private void work(Job job) { work(job, null); }
    private void work(Job job, Runnable after) {
        for (Button control : new Button[]{signIn, refresh, signOut, makeDrawing, sendQueued, openDrawing, notifications}) control.setEnabled(false);
        status.setText(R.string.setup_working);
        worker.execute(() -> {
            String result;
            try { result = job.run(); }
            catch (Exception error) { result = error.getMessage() == null ? getString(R.string.setup_try_again) : error.getMessage(); }
            String text = result;
            runOnUiThread(() -> { status.setText(text); updateControls(); if (after != null) after.run(); });
        });
    }
    private void updateControls() {
        // One decrypt per pass: a session cleared between two loads would otherwise NPE below.
        SessionStore.Session session = SessionStore.load(this);
        boolean signed = session != null;
        email.setVisibility(signed ? View.GONE : View.VISIBLE);
        password.setVisibility(signed ? View.GONE : View.VISIBLE);
        signIn.setVisibility(signed ? View.GONE : View.VISIBLE);
        makeDrawing.setVisibility(signed ? View.VISIBLE : View.GONE);
        sendQueued.setVisibility(signed ? View.VISIBLE : View.GONE);
        sendQueued.setText(signed ? getString(R.string.setup_send_queued_count, PendingDrawings.count(this, session.userId)) : getString(R.string.setup_send_queued));
        notifications.setVisibility(signed ? View.VISIBLE : View.GONE);
        openDrawing.setVisibility(signed && DrawingWidget.imageFile(this).exists() ? View.VISIBLE : View.GONE);
        refresh.setVisibility(signed ? View.VISIBLE : View.GONE);
        signOut.setVisibility(signed ? View.VISIBLE : View.GONE);
        boolean allowed = notificationsAllowed();
        notificationStatus.setVisibility(signed ? View.VISIBLE : View.GONE);
        notificationAction.setVisibility(signed ? View.VISIBLE : View.GONE);
        notificationStatus.setText(allowed ? R.string.setup_notifications_on : R.string.setup_notifications_off);
        notificationAction.setText(allowed ? R.string.setup_notifications_settings : R.string.setup_notifications_allow);
        signIn.setEnabled(DrawingApi.configured()); makeDrawing.setEnabled(signed);
        sendQueued.setEnabled(signed); notifications.setEnabled(signed); openDrawing.setEnabled(signed); refresh.setEnabled(signed); signOut.setEnabled(signed);
    }
    @Override protected void onStart() {
        super.onStart();
        updateControls();
        ReleaseInfo release = AppUpdates.available(this);
        updatePanel.setVisibility(release == null ? View.GONE : View.VISIBLE);
        if (release != null) updateText.setText(getString(R.string.setup_update_available, release.versionName));
        UpdateCheckJob.runSoon(this);
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
