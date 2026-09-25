package app.ustogether;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class ReleaseInfoTest {
    private static final String MANIFEST = "https://github.com/owner/repo/releases/latest/download/update.json";
    private static final String APK = "https://github.com/owner/repo/releases/download/android-v120/us-together.apk";
    private static final String DIGEST = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @Test public void acceptsAReleaseFromTheManifestHost() {
        ReleaseInfo release = ReleaseInfo.of(120, " 0.3.120 ", APK, DIGEST.toUpperCase(), MANIFEST);
        assertNotNull(release);
        assertEquals(120, release.versionCode);
        assertEquals("0.3.120", release.versionName);
        assertEquals(DIGEST, release.sha256);
    }

    @Test public void comparesAgainstTheInstalledVersionCode() {
        ReleaseInfo release = ReleaseInfo.of(120, "0.3.120", APK, DIGEST, MANIFEST);
        assertTrue(release.isNewerThan(119));
        assertFalse(release.isNewerThan(120));
        assertFalse(release.isNewerThan(121));
    }

    @Test public void rejectsAnApkFromAnotherHost() {
        assertNull(ReleaseInfo.of(120, "0.3.120", "https://example.com/us-together.apk", DIGEST, MANIFEST));
    }

    @Test public void rejectsPlainHttpAndCredentials() {
        assertNull(ReleaseInfo.of(120, "0.3.120", "http://github.com/owner/repo/a.apk", DIGEST, MANIFEST));
        assertNull(ReleaseInfo.of(120, "0.3.120", "https://user:pass@github.com/owner/repo/a.apk", DIGEST, MANIFEST));
        assertNull(ReleaseInfo.of(120, "0.3.120", APK, DIGEST, "http://github.com/owner/repo/update.json"));
    }

    @Test public void rejectsMalformedFields() {
        assertNull(ReleaseInfo.of(0, "0.3.0", APK, DIGEST, MANIFEST));
        assertNull(ReleaseInfo.of(120, "", APK, DIGEST, MANIFEST));
        assertNull(ReleaseInfo.of(120, null, APK, DIGEST, MANIFEST));
        assertNull(ReleaseInfo.of(120, "x".repeat(41), APK, DIGEST, MANIFEST));
        assertNull(ReleaseInfo.of(120, "0.3.120", APK, "not-a-digest", MANIFEST));
        assertNull(ReleaseInfo.of(120, "0.3.120", APK, null, MANIFEST));
        assertNull(ReleaseInfo.of(120, "0.3.120", "not a url", DIGEST, MANIFEST));
        assertNull(ReleaseInfo.of(120, "0.3.120", null, DIGEST, MANIFEST));
    }

    @Test public void readsOnlyHttpsHosts() {
        assertEquals("github.com", ReleaseInfo.httpsHost("https://GitHub.com/x"));
        assertNull(ReleaseInfo.httpsHost("ftp://github.com/x"));
        assertNull(ReleaseInfo.httpsHost(""));
        assertNull(ReleaseInfo.httpsHost(null));
    }
}
