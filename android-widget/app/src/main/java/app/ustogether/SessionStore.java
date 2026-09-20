package app.ustogether;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class SessionStore {
    private static final String ALIAS = "us_together_widget_session";
    private static final String PREF = "secure_session";
    private SessionStore() {}

    static final class Session {
        String access;
        String refresh;
        String userId;
        String deviceToken;
        long expiresAt;
        Session(String access, String refresh, String userId, long expiresAt, String deviceToken) {
            this.access = access; this.refresh = refresh; this.userId = userId;
            this.expiresAt = expiresAt; this.deviceToken = deviceToken;
        }
    }

    private static SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(ALIAS)) return ((KeyStore.SecretKeyEntry) store.getEntry(ALIAS, null)).getSecretKey();
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
        return generator.generateKey();
    }

    static synchronized void save(Context context, Session session) throws Exception {
        JSONObject value = new JSONObject();
        value.put("access", session.access); value.put("refresh", session.refresh);
        value.put("userId", session.userId); value.put("expiresAt", session.expiresAt);
        value.put("deviceToken", session.deviceToken == null ? "" : session.deviceToken);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key());
        byte[] encoded = cipher.doFinal(value.toString().getBytes(StandardCharsets.UTF_8));
        SharedPreferences.Editor editor = context.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit();
        editor.putString("ciphertext", Base64.encodeToString(encoded, Base64.NO_WRAP));
        editor.putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP));
        if (!editor.commit()) throw new IllegalStateException("Could not save session");
    }

    static synchronized Session load(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
            String text = prefs.getString("ciphertext", null), iv = prefs.getString("iv", null);
            if (text == null || iv == null) return null;
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
            JSONObject value = new JSONObject(new String(cipher.doFinal(Base64.decode(text, Base64.NO_WRAP)), StandardCharsets.UTF_8));
            return new Session(value.getString("access"), value.getString("refresh"), value.getString("userId"),
                value.getLong("expiresAt"), value.optString("deviceToken", ""));
        } catch (Exception ignored) { return null; }
    }

    static synchronized void clear(Context context) {
        context.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit().clear().commit();
    }
}
