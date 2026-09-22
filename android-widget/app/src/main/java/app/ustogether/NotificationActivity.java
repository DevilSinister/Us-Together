package app.ustogether;

import android.app.Activity;
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
    private TextView status, unread;
    private Button refresh;
    private JSONArray current = new JSONArray();

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        int gutter = Ui.dp(this, R.dimen.gutter_page);
        page.setPadding(gutter, Ui.dp(this, R.dimen.space_10), gutter, Ui.dp(this, R.dimen.space_6));
        page.setBackgroundColor(getColor(R.color.background));

        page.addView(Ui.text(this, R.style.Text_Eyebrow, R.string.inbox_eyebrow));
        page.addView(Ui.spaced(this, Ui.text(this, R.style.Text_Headline, R.string.inbox_heading), R.dimen.space_2));
        page.addView(Ui.spaced(this, Ui.text(this, R.style.Text_Lede, R.string.inbox_lede), R.dimen.space_3));

        refresh = Ui.button(this, R.style.Widget_UsTogether_Button_Outline, R.string.inbox_refresh);
        page.addView(Ui.spaced(this, refresh, R.dimen.space_5));

        unread = Ui.text(this, R.style.Text_Caption, "");
        page.addView(Ui.spaced(this, unread, R.dimen.space_4));

        status = Ui.text(this, R.style.Text_Caption, "");
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        page.addView(status);

        page.addView(Ui.divider(this));

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

    private void load() {
        refresh.setEnabled(false);
        status.setText(R.string.inbox_checking);
        worker.execute(() -> {
            try {
                JSONArray rows = DrawingApi.notifications(this);
                runOnUiThread(() -> {
                    current = rows;
                    status.setText(R.string.inbox_up_to_date);
                    refresh.setEnabled(true);
                    render();
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    status.setText(R.string.inbox_offline);
                    refresh.setEnabled(true);
                });
            }
        });
    }

    private void render() {
        list.removeAllViews();
        int unreadCount = 0;
        for (int i = 0; i < current.length(); i++) {
            JSONObject row = current.optJSONObject(i);
            if (row != null && row.isNull("read_at")) unreadCount++;
        }
        unread.setText(unreadCount > 0 ? getString(R.string.inbox_unread_count, unreadCount) : "");

        if (current.length() == 0) {
            // Content-led, not a card: an empty state here is a sentence, not a
            // box drawn around a sentence.
            list.addView(Ui.text(this, R.style.Text_Body, R.string.inbox_empty));
            return;
        }
        DateFormat date = new SimpleDateFormat(getString(R.string.inbox_date_pattern), Locale.getDefault());
        for (int i = 0; i < current.length(); i++) {
            JSONObject row = current.optJSONObject(i);
            if (row == null) continue;
            LinearLayout item = new LinearLayout(this);
            item.setOrientation(LinearLayout.VERTICAL);
            int vertical = Ui.dp(this, R.dimen.space_4);
            item.setPadding(0, vertical, 0, vertical);

            item.addView(Ui.text(this, R.style.Text_Body, row.optString("title", getString(R.string.inbox_untitled))));

            String when = row.optString("created_at", "");
            try { when = date.format(new Date(java.time.Instant.parse(when).toEpochMilli())); }
            catch (Exception ignored) { when = ""; }
            // category is already selected by DrawingApi and was being thrown
            // away; the web inbox prints it beside the date.
            String category = row.optString("category", "");
            String meta = category.isEmpty() ? when : when.isEmpty() ? category : when + " · " + category;
            item.addView(Ui.spaced(this, Ui.text(this, R.style.Text_Caption, meta), R.dimen.space_1));

            if (row.isNull("read_at")) {
                Button markRead = Ui.button(this, R.style.Widget_UsTogether_Button_Ghost, R.string.inbox_mark_read);
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
                                status.setText(R.string.inbox_mark_read_failed);
                            });
                        }
                    });
                });
                item.addView(Ui.spaced(this, markRead, R.dimen.space_2));
            }

            list.addView(item);
            // Separated by a fine rule rather than each row sitting in its own
            // tinted box, which is what read wrong here.
            if (i < current.length() - 1) {
                View rule = new View(this);
                rule.setBackgroundColor(getColor(R.color.border));
                list.addView(rule, new LinearLayout.LayoutParams(-1, Ui.dp(this, R.dimen.stroke_hairline)));
            }
        }
    }

    @Override protected void onDestroy() {
        worker.shutdown();
        super.onDestroy();
    }
}
