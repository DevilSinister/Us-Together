package app.ustogether;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

final class DrawingApi {
    private DrawingApi() {}
    private static final int MAX_IMAGE = 2 * 1024 * 1024;
    static boolean configured() {
        return BuildConfig.SUPABASE_URL.startsWith("https://") &&
            BuildConfig.SUPABASE_KEY.length() > 20;
    }
    private static String enc(String value) {
        try { return URLEncoder.encode(value, "UTF-8"); }
        catch (java.io.UnsupportedEncodingException error) { throw new AssertionError(error); }
    }
    private static String base() { return BuildConfig.SUPABASE_URL.replaceAll("/+$", ""); }

    private static final class Reply {
        final int status; final byte[] body;
        Reply(int status, byte[] body) { this.status = status; this.body = body; }
        String text() { return new String(body, StandardCharsets.UTF_8); }
    }

    private static Reply call(String method, String url, String token, String payload, String prefer) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(10000); connection.setReadTimeout(15000);
        connection.setRequestMethod(method);
        connection.setRequestProperty("apikey", BuildConfig.SUPABASE_KEY);
        if (token != null) connection.setRequestProperty("Authorization", "Bearer " + token);
        if (prefer != null) connection.setRequestProperty("Prefer", prefer);
        if (payload != null) {
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            try (java.io.OutputStream output = connection.getOutputStream()) {
                output.write(payload.getBytes(StandardCharsets.UTF_8));
            }
        }
        int status = connection.getResponseCode();
        try (InputStream stream = status < 400 ? connection.getInputStream() : connection.getErrorStream()) {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            if (stream != null) {
                byte[] chunk = new byte[8192]; int count;
                while ((count = stream.read(chunk)) >= 0) {
                    output.write(chunk, 0, count);
                    if (output.size() > MAX_IMAGE + 8192) throw new IllegalStateException("Response too large");
                }
            }
            return new Reply(status, output.toByteArray());
        } finally { connection.disconnect(); }
    }

    static SessionStore.Session signIn(Context context, String email, String password) throws Exception {
        if (!configured()) throw new IllegalStateException("The widget is not configured yet.");
        JSONObject request = new JSONObject().put("email", email.trim()).put("password", password);
        Reply result = call("POST", base() + "/auth/v1/token?grant_type=password", null, request.toString(), null);
        if (result.status != 200) throw new IllegalStateException("Sign-in failed. Check your email and password.");
        JSONObject json = new JSONObject(result.text());
        String access = json.getString("access_token");
        SessionStore.Session session = new SessionStore.Session(access, json.getString("refresh_token"),
            userId(access), System.currentTimeMillis() + json.getLong("expires_in") * 1000L, "");
        SessionStore.save(context, session);
        return session;
    }

    private static String userId(String jwt) throws Exception {
        String[] parts = jwt.split("\\.");
        if (parts.length < 2) throw new IllegalStateException("Invalid session");
        byte[] claim = Base64.decode(parts[1], Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        return new JSONObject(new String(claim, StandardCharsets.UTF_8)).getString("sub");
    }

    static synchronized SessionStore.Session session(Context context) throws Exception {
        SessionStore.Session current = SessionStore.load(context);
        if (current == null) throw new IllegalStateException("Sign in to see your partner's drawing.");
        if (current.expiresAt > System.currentTimeMillis() + 60000) return current;
        JSONObject request = new JSONObject().put("refresh_token", current.refresh);
        Reply result = call("POST", base() + "/auth/v1/token?grant_type=refresh_token", null, request.toString(), null);
        if (result.status != 200) {
            SessionStore.clear(context); DrawingWidget.clearImage(context); DrawingWidget.renderAll(context);
            throw new IllegalStateException("Session expired. Sign in again.");
        }
        JSONObject json = new JSONObject(result.text());
        current.access = json.getString("access_token");
        current.refresh = json.getString("refresh_token");
        current.expiresAt = System.currentTimeMillis() + json.getLong("expires_in") * 1000L;
        SessionStore.save(context, current);
        return current;
    }

    static void registerDevice(Context context, String token) throws Exception {
        SessionStore.Session session = session(context);
        if (session.deviceToken != null && !session.deviceToken.isEmpty() && !session.deviceToken.equals(token)) {
            call("DELETE", base() + "/rest/v1/drawing_devices?token=eq." + enc(session.deviceToken), session.access, null, null);
        }
        JSONObject body = new JSONObject().put("token", token).put("user_id", session.userId)
            .put("last_seen_at", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US)
                {{ setTimeZone(java.util.TimeZone.getTimeZone("UTC")); }}.format(new java.util.Date()));
        Reply response = call("POST", base() + "/rest/v1/drawing_devices?on_conflict=token",
            session.access, body.toString(), "resolution=merge-duplicates,return=minimal");
        if (response.status < 200 || response.status >= 300) throw new IllegalStateException("Could not register device.");
        session.deviceToken = token;
        SessionStore.save(context, session);
    }

    static void unregisterDevice(Context context) throws Exception {
        SessionStore.Session current = SessionStore.load(context);
        if (current == null || current.deviceToken == null || current.deviceToken.isEmpty()) return;
        SessionStore.Session session = session(context);
        Reply result = call("DELETE", base() + "/rest/v1/drawing_devices?token=eq." + enc(current.deviceToken),
            session.access, null, null);
        if (result.status < 200 || result.status >= 300) throw new IllegalStateException("Could not unregister this device. Connect to the internet and try again.");
    }

    static JSONArray notifications(Context context) throws Exception {
        SessionStore.Session session = session(context);
        String path = "/rest/v1/notifications?select=id,title,category,read_at,created_at"
            + "&recipient_id=eq." + enc(session.userId) + "&order=created_at.desc&limit=30";
        Reply result = call("GET", base() + path, session.access, null, null);
        if (result.status != 200) throw new IllegalStateException("Could not refresh notifications.");
        JSONArray rows = new JSONArray(result.text());
        context.getSharedPreferences("notification-cache", Context.MODE_PRIVATE)
            .edit().putString(session.userId, rows.toString()).apply();
        return rows;
    }

    static JSONArray cachedNotifications(Context context) {
        SessionStore.Session session = SessionStore.load(context);
        if (session == null) return new JSONArray();
        String cached = context.getSharedPreferences("notification-cache", Context.MODE_PRIVATE)
            .getString(session.userId, "[]");
        try { return new JSONArray(cached); }
        catch (Exception ignored) { return new JSONArray(); }
    }

    static void clearNotificationCache(Context context, String userId) {
        context.getSharedPreferences("notification-cache", Context.MODE_PRIVATE).edit().remove(userId).apply();
    }

    static void markNotificationRead(Context context, String notificationId) throws Exception {
        SessionStore.Session session = session(context);
        Reply result = call("POST", base() + "/rest/v1/rpc/mark_notification_read",
            session.access, new JSONObject().put("notification_id", notificationId).toString(), null);
        if (result.status != 200)
            throw new IllegalStateException("Could not mark this update as read.");
    }

    static String refreshLatest(Context context) throws Exception {
        SessionStore.Session session = session(context);
        String query = "/rest/v1/drawing_notes?select=id,object_path,sent_at&recipient_id=eq." + enc(session.userId) +
            "&status=eq.ready&order=sent_at.desc,id.desc&limit=1";
        Reply result = call("GET", base() + query, session.access, null, null);
        if (result.status != 200) throw new IllegalStateException("Could not check for new drawings.");
        JSONArray rows = new JSONArray(result.text());
        if (rows.length() == 0) {
            DrawingWidget.clearImage(context);
            DrawingWidget.renderAll(context);
            return "No drawing from your partner yet.";
        }
        JSONObject row = rows.getJSONObject(0);
        String id = row.getString("id");
        String sentAt = row.optString("sent_at", "");
        if (!id.equals(DrawingWidget.cachedId(context)) || !DrawingWidget.imageFile(context).exists()) {
            String path = row.getString("object_path");
            Reply image = call("GET", base() + "/storage/v1/object/authenticated/drawing-notes/" +
                path, session.access, null, null);
            if (image.status != 200 || image.body.length < 100 || image.body.length > MAX_IMAGE)
                throw new IllegalStateException("Could not download the latest drawing.");
            Bitmap bitmap = BitmapFactory.decodeByteArray(image.body, 0, image.body.length);
            if (bitmap == null || bitmap.getWidth() != 640 || bitmap.getHeight() != 480)
                throw new IllegalStateException("The latest drawing could not be displayed.");
            File temp = new File(context.getFilesDir(), "latest.tmp");
            try (FileOutputStream output = new FileOutputStream(temp)) { output.write(image.body); output.getFD().sync(); }
            if (!temp.renameTo(DrawingWidget.imageFile(context))) throw new IllegalStateException("Could not cache the drawing.");
        }
        DrawingWidget.setCached(context, id, sentAt);
        DrawingWidget.renderAll(context);
        return "Latest drawing is ready on your home screen.";
    }

    private static Reply upload(String path, String token, byte[] png) throws Exception {
        if (png.length < 100 || png.length > MAX_IMAGE) throw new IllegalStateException("Drawing must be under 2 MB.");
        HttpURLConnection connection = (HttpURLConnection) new URL(base() +
            "/storage/v1/object/drawing-notes/" + path).openConnection();
        connection.setConnectTimeout(10000); connection.setReadTimeout(20000);
        connection.setRequestMethod("POST"); connection.setDoOutput(true);
        connection.setRequestProperty("apikey", BuildConfig.SUPABASE_KEY);
        connection.setRequestProperty("Authorization", "Bearer " + token);
        connection.setRequestProperty("Content-Type", "image/png");
        connection.setFixedLengthStreamingMode(png.length);
        try (java.io.OutputStream output = connection.getOutputStream()) { output.write(png); }
        int status = connection.getResponseCode();
        try (InputStream input = status < 400 ? connection.getInputStream() : connection.getErrorStream()) {
            ByteArrayOutputStream body = new ByteArrayOutputStream();
            if (input != null) {
                byte[] buffer = new byte[1024]; int count;
                while ((count = input.read(buffer)) >= 0 && body.size() < 8192) body.write(buffer, 0, count);
            }
            return new Reply(status, body.toByteArray());
        } finally { connection.disconnect(); }
    }

    static void sendDrawing(Context context, String id, byte[] png) throws Exception {
        // These two can never succeed on retry, so the outbox sets the file aside instead of blocking.
        if (!id.matches("[0-9a-fA-F-]{36}")) throw new PendingDrawings.PermanentSendFailure("Invalid drawing ID.");
        Bitmap bitmap = BitmapFactory.decodeByteArray(png, 0, png.length);
        if (bitmap == null || bitmap.getWidth() != 640 || bitmap.getHeight() != 480)
            throw new PendingDrawings.PermanentSendFailure("The drawing canvas is invalid.");
        bitmap.recycle();
        SessionStore.Session current = session(context);
        String path = current.userId + "/" + id + ".png";
        Reply existing = call("GET", base() + "/rest/v1/drawing_notes?select=id,status&id=eq." + enc(id),
            current.access, null, null);
        if (existing.status != 200) throw new IllegalStateException("Could not check the drawing send state.");
        JSONArray rows = new JSONArray(existing.text());
        if (rows.length() > 0 && "ready".equals(rows.getJSONObject(0).optString("status"))) return;
        if (rows.length() == 0) {
            Reply members = call("GET", base() +
                "/rest/v1/couple_memberships?select=couple_id,user_id&left_at=is.null",
                current.access, null, null);
            if (members.status != 200) throw new IllegalStateException("Could not check your partner.");
            JSONArray list = new JSONArray(members.text());
            String couple = null, partner = null;
            for (int i = 0; i < list.length(); i++) {
                JSONObject row = list.getJSONObject(i);
                if (current.userId.equals(row.getString("user_id"))) couple = row.getString("couple_id");
            }
            if (couple == null) throw new IllegalStateException("Connect your partner before sending.");
            for (int i = 0; i < list.length(); i++) {
                JSONObject row = list.getJSONObject(i);
                if (couple.equals(row.getString("couple_id")) &&
                    !current.userId.equals(row.getString("user_id"))) partner = row.getString("user_id");
            }
            if (partner == null) throw new IllegalStateException("Your partner is not connected.");
            JSONObject note = new JSONObject().put("id", id).put("couple_id", couple)
                .put("author_id", current.userId).put("recipient_id", partner)
                .put("object_path", path);
            Reply prepared = call("POST", base() + "/rest/v1/drawing_notes", current.access,
                note.toString(), "return=minimal");
            if (prepared.status < 200 || prepared.status >= 300)
                throw new IllegalStateException("Could not prepare the drawing for your partner.");
        }
        Reply sent = upload(path, current.access, png);
        if (sent.status < 200 || sent.status >= 300) {
            Reply stored = call("GET", base() + "/storage/v1/object/authenticated/drawing-notes/" +
                path, current.access, null, null);
            if (stored.status != 200 || !Arrays.equals(stored.body, png))
                throw new IllegalStateException("Could not upload the drawing.");
        }
        Reply published = call("PATCH", base() + "/rest/v1/drawing_notes?id=eq." + enc(id) +
            "&status=eq.pending", current.access, new JSONObject().put("status", "ready").toString(),
            "return=representation");
        if (published.status < 200 || published.status >= 300)
            throw new IllegalStateException("Could not finish sending the drawing.");
        if (new JSONArray(published.text()).length() == 0) {
            Reply confirmed = call("GET", base() + "/rest/v1/drawing_notes?select=id,status&id=eq." + enc(id),
                current.access, null, null);
            if (confirmed.status != 200 || new JSONArray(confirmed.text()).length() == 0 ||
                !"ready".equals(new JSONArray(confirmed.text()).getJSONObject(0).optString("status")))
                throw new IllegalStateException("Could not confirm the drawing was sent.");
        }
    }
}
