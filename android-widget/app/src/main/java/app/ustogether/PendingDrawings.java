package app.ustogether;

import android.content.Context;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.util.UUID;

/**
 * The offline outbox: one PNG per queued drawing, under an app-private per-user folder.
 * A sync sends every file it can and never lets one bad file block the ones behind it.
 */
final class PendingDrawings {
    private PendingDrawings() {}

    /** Thrown by the sender for a file that can never succeed (bad id, invalid image). */
    static final class PermanentSendFailure extends Exception {
        PermanentSendFailure(String message) { super(message); }
    }
    interface Sender { void send(String id, byte[] png) throws Exception; }
    static final class Report {
        int sent, permanent, waiting;
        String firstError;
    }

    private static File directory(Context context, String userId) {
        return new File(new File(context.getFilesDir(), "pending-drawings"), userId);
    }
    private static File[] queued(File folder) {
        return folder.listFiles((dir, name) -> name.endsWith(".png") && !name.endsWith(".failed.png"));
    }
    static int count(Context context, String userId) {
        File[] files = queued(directory(context, userId));
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

    /** Sends what it can; throws only when something is still waiting, so callers retry. */
    static synchronized int sync(Context context) throws Exception {
        SessionStore.Session session = DrawingApi.session(context);
        File[] files = queued(directory(context, session.userId));
        if (files == null || files.length == 0) return 0;
        Report report = syncFiles(files, (id, png) -> DrawingApi.sendDrawing(context, id, png));
        if (report.waiting > 0) {
            throw new IllegalStateException(report.sent + " sent, " + report.waiting + " waiting to retry."
                + (report.firstError == null ? "" : " " + report.firstError));
        }
        return report.sent;
    }

    /**
     * Pure loop, testable without Android: a sent file is deleted, a permanently rejected
     * file is set aside as `<id>.failed.png`, and a transient failure is left for next time.
     */
    static Report syncFiles(File[] files, Sender sender) {
        Report report = new Report();
        for (File file : files) {
            String name = file.getName(), id = name.substring(0, name.length() - 4);
            try {
                byte[] png = Files.readAllBytes(file.toPath());
                sender.send(id, png);
                if (!file.delete()) { report.waiting++; report.firstError = "Drawing sent, but local queue cleanup failed."; }
                else report.sent++;
            } catch (PermanentSendFailure failure) {
                File aside = new File(file.getParentFile(), id + ".failed.png");
                if (!file.renameTo(aside)) file.delete();
                report.permanent++;
            } catch (Exception error) {
                report.waiting++;
                if (report.firstError == null) report.firstError = error.getMessage();
            }
        }
        return report;
    }

    static void clear(Context context, String userId) {
        File folder = directory(context, userId);
        File[] files = folder.listFiles();
        if (files != null) for (File file : files) file.delete();
        folder.delete();
    }
}
