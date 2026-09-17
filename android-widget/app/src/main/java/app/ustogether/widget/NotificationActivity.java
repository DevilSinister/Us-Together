package app.ustogether.widget;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class NotificationActivity extends Activity {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private LinearLayout list;
    private TextView status;
    private Button refresh;
    private JSONArray current = new JSONArray();

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(24, 36, 24, 24);
        page.setBackgroundColor(Color.rgb(251, 247, 243));
        TextView heading = text("Partner updates", 28, Color.rgb(111, 23, 48));
        page.addView(heading);
        page.addView(text("Shared activity appears here without copying private details.", 15, Color.rgb(84, 43, 52)));
        refresh = new Button(this);
        refresh.setText("Refresh updates");
        page.addView(refresh);
        status = text("", 14, Color.rgb(84, 43, 52));
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        page.addView(status);
        ScrollView scroll = new ScrollView(this);
        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(list);
        page.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(page);
        current = DrawingApi.cachedNotifications(this);
        render();
        refresh.setOnClickListener(view -> load());
        load();
    }

    private TextView text(String value, int size, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setPadding(0, 10, 0, 10);
        return view;
    }

    private void load() {
        refresh.setEnabled(false);
        status.setText("Checking for updates...");
        worker.execute(() -> {
            try {
                JSONArray rows = DrawingApi.notifications(this);
                runOnUiThread(() -> {
                    current = rows;
                    status.setText("Up to date");
                    refresh.setEnabled(true);
                    render();
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    status.setText("Offline or unable to refresh. Showing saved updates.");
                    refresh.setEnabled(true);
                });
            }
        });
    }

    private void render() {
        list.removeAllViews();
        if (current.length() == 0) {
            list.addView(text("No partner updates yet.", 16, Color.rgb(47, 37, 39)));
            return;
        }
        DateFormat date = new SimpleDateFormat("MMM d, h:mm a", Locale.getDefault());
        for (int i = 0; i < current.length(); i++) {
            JSONObject row = current.optJSONObject(i);
            if (row == null) continue;
            LinearLayout item = new LinearLayout(this);
            item.setOrientation(LinearLayout.VERTICAL);
            item.setPadding(16, 14, 16, 14);
            item.setBackgroundColor(Color.rgb(255, 250, 246));
            TextView title = text(row.optString("title", "Shared activity"), 18, Color.rgb(47, 37, 39));
            item.addView(title);
            String when = row.optString("created_at", "");
            try { when = date.format(new Date(java.time.Instant.parse(when).toEpochMilli())); }
            catch (Exception ignored) { when = ""; }
            item.addView(text(when, 13, Color.rgb(84, 43, 52)));
            if (row.isNull("read_at")) {
                Button markRead = new Button(this);
                markRead.setText("Mark read");
                String id = row.optString("id", "");
                markRead.setOnClickListener(view -> {
                    markRead.setEnabled(false);
                    worker.execute(() -> {
                        try {
                            DrawingApi.markNotificationRead(this, id);
                            runOnUiThread(this::load);
                        } catch (Exception error) {
                            runOnUiThread(() -> {
                                markRead.setEnabled(true);
                                status.setText("Could not mark this update as read. Try again when connected.");
                            });
                        }
                    });
                });
                item.addView(markRead);
            }
            LinearLayout.LayoutParams spacing = new LinearLayout.LayoutParams(-1, -2);
            spacing.bottomMargin = 12;
            list.addView(item, spacing);
        }
    }

    @Override protected void onDestroy() {
        worker.shutdown();
        super.onDestroy();
    }
}
