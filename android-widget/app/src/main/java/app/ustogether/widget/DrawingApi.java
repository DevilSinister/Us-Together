package app.ustogether.widget;

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

final class DrawingApi {
    private DrawingApi() {}
    private static final int MAX_IMAGE = 2 * 1024 * 1024;
    static boolean configured() {
        return BuildConfig.SUPABASE_URL.startsWith("https://") &&
            BuildConfig.SUPABASE_KEY.length() > 20 && BuildConfig.WEB_BASE_URL.startsWith("https://");
    }
    private static String enc(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
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

    static boolean pushServerConfigured() {
        try {
            Reply result = call("GET", BuildConfig.WEB_BASE_URL.replaceAll("/+$", "") + "/api/drawing-notes/push-status", null, null, null);
            return result.status == 200 && new JSONObject(result.text()).optBoolean("configured", false);
        } catch (Exception ignored) { return false; }
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

    static SessionStore.Session session(Context context) throws Exception {
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
            DrawingWidget.setCachedId(context, id);
        }
        DrawingWidget.renderAll(context);
        return "Latest drawing is ready on your home screen.";
    }
}
