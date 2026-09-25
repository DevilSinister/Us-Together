package app.ustogether;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** The phone draws on square paper; every reader must still take the older 4:3 notes. */
public final class DrawingCanvasSizeTest {
    @Test public void paperIsSquare() {
        assertEquals(DrawingCanvasView.WIDTH, DrawingCanvasView.HEIGHT);
    }

    @Test public void readersAcceptSquareAndLegacyNotes() {
        assertTrue(DrawingCanvasView.isNoteCanvas(640, 640));
        assertTrue(DrawingCanvasView.isNoteCanvas(640, 480));
    }

    @Test public void readersRefuseAnyOtherShape() {
        assertFalse(DrawingCanvasView.isNoteCanvas(480, 640));
        assertFalse(DrawingCanvasView.isNoteCanvas(1280, 1280));
        assertFalse(DrawingCanvasView.isNoteCanvas(640, 360));
        assertFalse(DrawingCanvasView.isNoteCanvas(0, 0));
    }
}
