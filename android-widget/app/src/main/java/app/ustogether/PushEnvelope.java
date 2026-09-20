package app.ustogether;

import java.util.Map;
import java.util.regex.Pattern;

/**
 * The content-free data message the fcm-dispatch Edge Function sends. Everything here is
 * validated before it can become a notification or an intent: a bad envelope is dropped,
 * and a target path that is not a same-origin absolute path falls back to the inbox.
 */
final class PushEnvelope {
    private static final Pattern UUID = Pattern.compile("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
    static final String INBOX_PATH = "/notifications";

    final String notificationId;
    final String category;
    final String title;
    final String targetPath;
    final String tag;

    private PushEnvelope(String notificationId, String category, String title, String targetPath) {
        this.notificationId = notificationId;
        this.category = category;
        this.title = title;
        this.targetPath = targetPath;
        this.tag = "us-" + notificationId;
    }

    /** Returns null when the message is not one of ours. */
    static PushEnvelope parse(Map<String, String> data, String fallbackTitle) {
        if (data == null) return null;
        String id = data.get("notificationId");
        if (id == null || !UUID.matcher(id).matches()) return null;
        String category = value(data.get("category"), value(data.get("type"), "system"));
        String title = value(data.get("title"), fallbackTitle);
        if (title.length() > 120) title = title.substring(0, 120);
        return new PushEnvelope(id, category, title, safePath(data.get("targetPath")));
    }

    boolean isDrawing() { return "drawing".equals(category); }

    /** Accepts only an absolute path on our own origin: no scheme, no host, no whitespace. */
    static String safePath(String path) {
        if (path == null || path.isEmpty() || !path.startsWith("/") || path.startsWith("//")) return INBOX_PATH;
        if (path.length() > 200 || path.contains(":") || path.contains(" ") || path.contains("\n") || path.contains("..")) return INBOX_PATH;
        return path;
    }

    private static String value(String candidate, String fallback) {
        return candidate == null || candidate.trim().isEmpty() ? fallback : candidate.trim();
    }
}
