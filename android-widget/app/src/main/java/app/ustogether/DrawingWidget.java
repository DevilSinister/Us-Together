package app.ustogether;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.text.format.DateUtils;
import android.util.DisplayMetrics;
import android.view.View;
import android.widget.RemoteViews;
import java.io.File;
import java.time.Instant;
import java.time.OffsetDateTime;

/**
 * Home-screen widget showing the latest drawing the partner sent. The image is a private
 * cached PNG; the caption is "From your partner · 2 h ago" and never a display name,
 * because a home screen is readable by anyone glancing at the phone.
 */
public final class DrawingWidget extends AppWidgetProvider {
    private static final String PREF = "widget_state";
    static final String ACTION_REFRESH = "app.ustogether.widget.REFRESH";
    /** 4:3, and under the ~1 MB RemoteViews bitmap budget (560×420 ARGB ≈ 940 KB). */
    private static final int MAX_WIDTH = 560, MAX_HEIGHT = 420;
    private static final int PADDING_DP = 16, CAPTION_DP = 52;

    private static SharedPreferences prefs(Context context) { return context.getSharedPreferences(PREF, Context.MODE_PRIVATE); }
    static File imageFile(Context context) { return new File(context.getFilesDir(), "latest.png"); }
    static String cachedId(Context context) { return prefs(context).getString("note_id", ""); }
    static String cachedSentAt(Context context) { return prefs(context).getString("note_sent_at", ""); }
    static void setCached(Context context, String id, String sentAt) {
        prefs(context).edit().putString("note_id", id).putString("note_sent_at", sentAt == null ? "" : sentAt).apply();
    }
    static void clearImage(Context context) {
        imageFile(context).delete();
        prefs(context).edit().remove("note_id").remove("note_sent_at").apply();
    }

    static void renderAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, DrawingWidget.class));
        if (ids.length == 0) return;
        Bitmap original = BitmapFactory.decodeFile(imageFile(context).getAbsolutePath());
        for (int id : ids) render(context, manager, id, original);
        if (original != null) original.recycle();
    }

    private static void render(Context context, AppWidgetManager manager, int id, Bitmap original) {
        String noteId = cachedId(context);
        boolean available = original != null && !noteId.isEmpty();
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.drawing_widget);
        views.setViewVisibility(R.id.drawing_image, available ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.drawing_empty, available ? View.GONE : View.VISIBLE);
        if (available) views.setImageViewBitmap(R.id.drawing_image, fitted(context, manager.getAppWidgetOptions(id), original));
        views.setTextViewText(R.id.drawing_caption, available ? caption(context) : context.getString(R.string.app_name));

        Intent open = new Intent(context, MainActivity.class);
        if (available) open.putExtra(MainActivity.EXTRA_OPEN_DRAWING, true);
        PendingIntent openPending = PendingIntent.getActivity(context, id, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.drawing_image, openPending);
        views.setOnClickPendingIntent(R.id.drawing_empty, openPending);

        Intent reply = new Intent(context, MainActivity.class).putExtra(MainActivity.EXTRA_ACTION, MainActivity.ACTION_DRAW);
        views.setOnClickPendingIntent(R.id.widget_reply, PendingIntent.getActivity(context, id + 100_000, reply,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        Intent refresh = new Intent(context, DrawingWidget.class).setAction(ACTION_REFRESH);
        views.setOnClickPendingIntent(R.id.widget_refresh, PendingIntent.getBroadcast(context, id + 200_000, refresh,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        manager.updateAppWidget(id, views);
    }

    /** Scale the 640×480 PNG to the cell the launcher actually gave this instance. */
    private static Bitmap fitted(Context context, Bundle options, Bitmap original) {
        DisplayMetrics metrics = context.getResources().getDisplayMetrics();
        int widthDp = options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        int heightDp = options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
        if (widthDp <= 0) widthDp = 180;
        if (heightDp <= 0) heightDp = 140;
        int widthPx = Math.max(64, Math.round((widthDp - PADDING_DP) * metrics.density));
        int heightPx = Math.max(48, Math.round((heightDp - PADDING_DP - CAPTION_DP) * metrics.density));
        // Fit 4:3 inside the box, then cap for the RemoteViews transaction.
        int width = Math.min(widthPx, heightPx * 4 / 3), height = width * 3 / 4;
        if (width > MAX_WIDTH) { width = MAX_WIDTH; height = MAX_HEIGHT; }
        if (width <= 0 || height <= 0) { width = 320; height = 240; }
        return Bitmap.createScaledBitmap(original, width, height, true);
    }

    private static String caption(Context context) {
        String from = context.getString(R.string.widget_from_partner);
        String sentAt = cachedSentAt(context);
        if (sentAt.isEmpty()) return from;
        try {
            long millis = parseInstant(sentAt);
            CharSequence ago = DateUtils.getRelativeTimeSpanString(millis, System.currentTimeMillis(),
                DateUtils.MINUTE_IN_MILLIS, DateUtils.FORMAT_ABBREV_RELATIVE);
            return from + " · " + ago;
        } catch (Exception ignored) { return from; }
    }

    /** PostgREST writes `+00:00` offsets, which Instant.parse on API 26 does not accept. */
    static long parseInstant(String iso) {
        try { return OffsetDateTime.parse(iso).toInstant().toEpochMilli(); }
        catch (Exception ignored) { return Instant.parse(iso).toEpochMilli(); }
    }

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        renderAll(context);
        DrawingRefreshJob.schedule(context);
    }

    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle newOptions) {
        Bitmap original = BitmapFactory.decodeFile(imageFile(context).getAbsolutePath());
        render(context, manager, id, original);
        if (original != null) original.recycle();
    }

    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) DrawingRefreshJob.enqueueNow(context);
    }
}
