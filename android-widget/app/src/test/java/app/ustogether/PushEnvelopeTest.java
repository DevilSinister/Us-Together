package app.ustogether;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.HashMap;
import java.util.Map;
import org.junit.Test;

public final class PushEnvelopeTest {
    private static final String ID = "a2000000-0000-4000-8000-000000000001";

    private static Map<String, String> drawing() {
        Map<String, String> data = new HashMap<>();
        data.put("notificationId", ID);
        data.put("category", "drawing");
        data.put("title", "A drawing was sent");
        data.put("targetPath", "/drawings/a3000000-0000-4000-8000-000000000001");
        return data;
    }

    @Test public void parsesADrawingEnvelope() {
        PushEnvelope envelope = PushEnvelope.parse(drawing(), "Us Together");
        assertEquals(ID, envelope.notificationId);
        assertTrue(envelope.isDrawing());
        assertEquals("A drawing was sent", envelope.title);
        assertEquals("/drawings/a3000000-0000-4000-8000-000000000001", envelope.targetPath);
        assertEquals("us-" + ID, envelope.tag);
    }

    @Test public void dropsAMessageWithoutAValidNotificationId() {
        Map<String, String> data = drawing();
        data.remove("notificationId");
        assertNull(PushEnvelope.parse(data, "Us Together"));
        data.put("notificationId", "not-a-uuid");
        assertNull(PushEnvelope.parse(data, "Us Together"));
        assertNull(PushEnvelope.parse(null, "Us Together"));
    }

    @Test public void fallsBackToTheInboxForAnythingThatIsNotOurPath() {
        assertEquals(PushEnvelope.INBOX_PATH, PushEnvelope.safePath(null));
        assertEquals(PushEnvelope.INBOX_PATH, PushEnvelope.safePath(""));
        assertEquals(PushEnvelope.INBOX_PATH, PushEnvelope.safePath("https://evil.example/steal"));
        assertEquals(PushEnvelope.INBOX_PATH, PushEnvelope.safePath("//evil.example/steal"));
        assertEquals(PushEnvelope.INBOX_PATH, PushEnvelope.safePath("/drawings/../../x"));
        assertEquals(PushEnvelope.INBOX_PATH, PushEnvelope.safePath("/plans/1 2"));
        assertEquals("/notes/abc", PushEnvelope.safePath("/notes/abc"));
    }

    @Test public void usesTheFallbackTitleAndCategoryWhenMissing() {
        Map<String, String> data = new HashMap<>();
        data.put("notificationId", ID);
        data.put("type", "note");
        PushEnvelope envelope = PushEnvelope.parse(data, "Us Together");
        assertEquals("Us Together", envelope.title);
        assertEquals("note", envelope.category);
        assertFalse(envelope.isDrawing());
        assertEquals(PushEnvelope.INBOX_PATH, envelope.targetPath);
    }
}
