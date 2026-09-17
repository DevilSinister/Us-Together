package app.ustogether.widget;

import android.content.Context;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.util.UUID;

final class PendingDrawings {
    private PendingDrawings() {}
    private static File directory(Context context, String userId) {
        return new File(new File(context.getFilesDir(), "pending-drawings"), userId);
    }
    static int count(Context context, String userId) {
        File[] files = directory(context, userId).listFiles((dir, name) -> name.endsWith(".png"));
        return files == null ? 0 : files.length;
    }
    static synchronized void enqueue(Context context, String userId, byte[] png) throws Exception {
        if (png.length < 100 || png.length > 2 * 1024 * 1024)
            throw new IllegalStateException("The drawing must be under 2 MB.");
        File folder = directory(context, userId);
        if (!folder.exists() && !folder.mkdirs()) throw new IllegalStateException("Could not save the drawing.");
        String id = UUID.randomUUID().toString();
        File temp = new File(folder, id + ".tmp"), target = new File(folder, id + ".png");
        try (FileOutputStream output = new FileOutputStream(temp)) {
            output.write(png); output.getFD().sync();
        }
        if (!temp.renameTo(target)) throw new IllegalStateException("Could not queue the drawing.");
        DrawingRefreshJob.enqueueNow(context);
    }
    static synchronized int sync(Context context) throws Exception {
        SessionStore.Session session = DrawingApi.session(context);
        File[] files = directory(context, session.userId).listFiles((dir, name) -> name.endsWith(".png"));
        if (files == null) return 0;
        int sent = 0;
        for (File file : files) {
            String name = file.getName(), id = name.substring(0, name.length() - 4);
            byte[] png = Files.readAllBytes(file.toPath());
            DrawingApi.sendDrawing(context, id, png);
            if (!file.delete()) throw new IllegalStateException("Drawing sent, but local queue cleanup failed.");
            sent++;
        }
        return sent;
    }
    static void clear(Context context, String userId) {
        File folder = directory(context, userId);
        File[] files = folder.listFiles();
        if (files != null) for (File file : files) file.delete();
        folder.delete();
    }
}
