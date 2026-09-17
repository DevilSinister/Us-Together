package app.ustogether.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import java.io.File;

public final class DrawingWidget extends AppWidgetProvider {
    private static final String PREF = "widget_state";
    static File imageFile(Context context) { return new File(context.getFilesDir(), "latest.png"); }
    static String cachedId(Context context) {
        return context.getSharedPreferences(PREF, Context.MODE_PRIVATE).getString("note_id", "");
    }
    static void setCachedId(Context context, String id) {
        context.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit().putString("note_id", id).apply();
    }
    static void clearImage(Context context) {
        imageFile(context).delete();
        context.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit().remove("note_id").apply();
    }
    static void renderAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, DrawingWidget.class));
        if (ids.length == 0) return;
        Bitmap original = BitmapFactory.decodeFile(imageFile(context).getAbsolutePath());
        Bitmap display = original == null ? null : Bitmap.createScaledBitmap(original, 320, 240, true);
        String noteId = cachedId(context);
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.drawing_widget);
            boolean available = display != null && !noteId.isEmpty();
            views.setViewVisibility(R.id.drawing_image, available ? View.VISIBLE : View.GONE);
            views.setViewVisibility(R.id.drawing_empty, available ? View.GONE : View.VISIBLE);
            if (available) views.setImageViewBitmap(R.id.drawing_image, display);
            Intent tap;
            if (available && BuildConfig.WEB_BASE_URL.startsWith("https://")) {
                tap = new Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.WEB_BASE_URL.replaceAll("/+$", "") + "/drawings/" + noteId));
            } else tap = new Intent(context, MainActivity.class);
            PendingIntent pending = PendingIntent.getActivity(context, id, tap,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.drawing_image, pending);
            views.setOnClickPendingIntent(R.id.drawing_empty, pending);
            manager.updateAppWidget(id, views);
        }
    }
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        renderAll(context);
        DrawingRefreshJob.schedule(context);
    }
}
