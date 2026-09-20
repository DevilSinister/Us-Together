package app.ustogether;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public final class PendingDrawingsSyncTest {
    @Rule public TemporaryFolder folder = new TemporaryFolder();

    private File queued(String id) throws Exception {
        File file = folder.newFile(id + ".png");
        Files.write(file.toPath(), new byte[]{1, 2, 3});
        return file;
    }

    @Test public void oneBadFileDoesNotBlockTheOnesBehindIt() throws Exception {
        File good = queued("11111111-1111-4111-8111-111111111111");
        File permanent = queued("22222222-2222-4222-8222-222222222222");
        File transientFailure = queued("33333333-3333-4333-8333-333333333333");
        File alsoGood = queued("44444444-4444-4444-8444-444444444444");
        List<String> sent = new ArrayList<>();

        PendingDrawings.Report report = PendingDrawings.syncFiles(
            new File[]{good, permanent, transientFailure, alsoGood},
            (id, png) -> {
                if (id.startsWith("2222")) throw new PendingDrawings.PermanentSendFailure("The drawing canvas is invalid.");
                if (id.startsWith("3333")) throw new IllegalStateException("Your partner is not connected.");
                sent.add(id);
            });

        assertEquals(2, report.sent);
        assertEquals(1, report.permanent);
        assertEquals(1, report.waiting);
        assertEquals("Your partner is not connected.", report.firstError);
        assertEquals(2, sent.size());
        assertFalse("sent file is deleted", good.exists());
        assertFalse("sent file is deleted", alsoGood.exists());
        assertFalse("permanent failure is moved aside", permanent.exists());
        assertTrue(new File(folder.getRoot(), "22222222-2222-4222-8222-222222222222.failed.png").exists());
        assertTrue("transient failure waits for the next sync", transientFailure.exists());
    }

    @Test public void anEmptyQueueReportsNothing() {
        PendingDrawings.Report report = PendingDrawings.syncFiles(new File[0], (id, png) -> { throw new AssertionError("never called"); });
        assertEquals(0, report.sent + report.permanent + report.waiting);
    }
}
