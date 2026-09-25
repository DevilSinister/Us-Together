package app.ustogether;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.view.MotionEvent;
import android.view.View;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.ArrayDeque;
import java.util.Random;

/**
 * The paper, the tools and the history.
 *
 * The paper is square. Notes drawn before that were 640×480, and every reader
 * accepts both sizes ({@link #isNoteCanvas}); a 4:3 draft left on the phone is
 * brought onto the square paper, centred, rather than thrown away.
 *
 * Freehand tools draw the whole stroke as one path over the paper as it was when
 * the finger went down. Drawing segment by segment made the highlighter darker at
 * every joint, where its translucent segments overlapped, and left pencil curves
 * visibly faceted.
 */
final class DrawingCanvasView extends View {
    static final int WIDTH = 640, HEIGHT = 640;
    private static final int LEGACY_HEIGHT = 480;
    /** Each snapshot is a full 640×640 bitmap (1.6 MB); undo and redo share this bound. */
    private static final int HISTORY = 15;
    /** How far a pixel may differ from the tapped one and still be filled, per channel. */
    private static final int FILL_TOLERANCE = 56;

    enum Tool { PENCIL, MARKER, HIGHLIGHTER, AIRBRUSH, FILL, RECTANGLE, ELLIPSE, DROPPER, ERASER }

    interface Listener {
        /** Undo or redo availability, or the paper itself, changed. */
        void onHistoryChanged();
        /** The eyedropper is reading a colour; {@code done} is true when the finger lifts. */
        void onInkPicked(int colour, boolean done);
        /** A finger has come down on the paper. */
        void onTouchStart();
    }

    static boolean isNoteCanvas(int width, int height) {
        return width == WIDTH && (height == HEIGHT || height == LEGACY_HEIGHT);
    }

    private final Bitmap image = Bitmap.createBitmap(WIDTH, HEIGHT, Bitmap.Config.ARGB_8888);
    private final Canvas paper = new Canvas(image);
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint blit = new Paint(Paint.FILTER_BITMAP_FLAG);
    private final RectF frame = new RectF();
    private final Random random = new Random();
    private final ArrayDeque<Bitmap> undo = new ArrayDeque<>(), redo = new ArrayDeque<>();
    private final Path stroke = new Path();
    private Tool tool = Tool.PENCIL;
    private int ink = Color.rgb(111, 23, 48), size = 4;
    private float lastX, lastY, startX, startY;
    /** The paper before the current stroke or shape: the newest undo entry, not a copy. */
    private Bitmap strokeBase;
    private Listener listener;
    private File draft;
    private boolean drawing;
    private final ExecutorService draftWorker = Executors.newSingleThreadExecutor();
    private volatile long draftGeneration;

    DrawingCanvasView(Context context) {
        super(context);
        paper.drawColor(Color.WHITE);
        setContentDescription("Drawing canvas");
    }

    void setListener(Listener value) { listener = value; }
    void setTool(Tool value) { tool = value; }
    Tool getTool() { return tool; }
    void setInk(int value) { ink = value | 0xff000000; }
    int getInk() { return ink; }
    void setBrushSize(int value) { size = Math.max(1, Math.min(12, value)); }
    int getBrushSize() { return size; }
    boolean canUndo() { return !undo.isEmpty(); }
    boolean canRedo() { return !redo.isEmpty(); }

    /** True while nothing but white paper has been drawn. */
    boolean isBlank() {
        int[] row = new int[WIDTH];
        for (int y = 0; y < HEIGHT; y++) {
            image.getPixels(row, 0, WIDTH, 0, y, WIDTH, 1);
            for (int pixel : row) if (pixel != Color.WHITE) return false;
        }
        return true;
    }

    void setDraft(File file) {
        draft = file;
        if (!file.exists()) return;
        Bitmap saved = BitmapFactory.decodeFile(file.getAbsolutePath());
        if (saved == null) return;
        if (saved.getWidth() == WIDTH && saved.getHeight() == HEIGHT) paper.drawBitmap(saved, 0, 0, null);
        else if (saved.getWidth() == WIDTH && saved.getHeight() == LEGACY_HEIGHT)
            paper.drawBitmap(saved, 0, (HEIGHT - LEGACY_HEIGHT) / 2f, null);
        saved.recycle();
        invalidate();
    }

    private void changed() {
        invalidate();
        if (listener != null) listener.onHistoryChanged();
    }

    private Bitmap snapshot() { return image.copy(Bitmap.Config.ARGB_8888, false); }

    private void remember() {
        undo.addLast(snapshot());
        if (undo.size() > HISTORY) undo.removeFirst().recycle();
        while (!redo.isEmpty()) redo.removeLast().recycle();
    }

    void undo() {
        if (undo.isEmpty() || drawing) return;
        redo.addLast(snapshot());
        Bitmap previous = undo.removeLast();
        paper.drawBitmap(previous, 0, 0, null);
        previous.recycle();
        saveDraft(); changed();
    }

    void redo() {
        if (redo.isEmpty() || drawing) return;
        undo.addLast(snapshot());
        if (undo.size() > HISTORY) undo.removeFirst().recycle();
        Bitmap next = redo.removeLast();
        paper.drawBitmap(next, 0, 0, null);
        next.recycle();
        saveDraft(); changed();
    }

    void clear() {
        if (isBlank()) return;
        remember(); paper.drawColor(Color.WHITE); saveDraft(); changed();
    }

    Bitmap exportSnapshot() { return snapshot(); }

    void saveDraft() {
        if (draft == null) return;
        Bitmap copy = snapshot();
        File target = draft;
        long generation = ++draftGeneration;
        draftWorker.execute(() -> {
            File temp = new File(target.getParentFile(), target.getName() + ".tmp");
            try (FileOutputStream output = new FileOutputStream(temp)) {
                copy.compress(Bitmap.CompressFormat.PNG, 100, output);
                output.getFD().sync();
                if (generation == draftGeneration && !temp.renameTo(target)) temp.delete();
                else if (generation != draftGeneration) temp.delete();
            } catch (Exception ignored) { temp.delete(); }
            finally { copy.recycle(); }
        });
    }

    void discardDraft() {
        ++draftGeneration;
        if (draft != null) {
            draft.delete();
            new File(draft.getParentFile(), draft.getName() + ".tmp").delete();
        }
        paper.drawColor(Color.WHITE); changed();
    }

    @Override protected void onDetachedFromWindow() {
        draftWorker.shutdown();
        super.onDetachedFromWindow();
    }

    /** The paper is square and so is this view, but a stray layout still letterboxes cleanly. */
    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float scale = scale();
        float left = (getWidth() - WIDTH * scale) / 2f, top = (getHeight() - HEIGHT * scale) / 2f;
        canvas.drawColor(getContext().getColor(R.color.canvas_mat));
        frame.set(left, top, left + WIDTH * scale, top + HEIGHT * scale);
        canvas.drawBitmap(image, null, frame, blit);
    }

    private float scale() { return Math.min(getWidth() / (float) WIDTH, getHeight() / (float) HEIGHT); }

    private float coordinate(float value, boolean x) {
        float scale = scale();
        float inset = ((x ? getWidth() : getHeight()) - (x ? WIDTH : HEIGHT) * scale) / 2f;
        return Math.max(0, Math.min((x ? WIDTH : HEIGHT) - 1, (value - inset) / scale));
    }

    private float width() {
        switch (tool) {
            case PENCIL: return Math.max(1.5f, size * .75f);
            case MARKER: return size * 3f;
            case HIGHLIGHTER: return size * 6f;
            case AIRBRUSH: return size * 7f;
            case ERASER: return size * 4.5f;
            default: return size;
        }
    }

    private void configure() {
        paint.reset(); paint.setAntiAlias(true);
        paint.setColor(tool == Tool.ERASER ? Color.WHITE : ink);
        paint.setStrokeWidth(width());
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeCap(tool == Tool.HIGHLIGHTER ? Paint.Cap.SQUARE : Paint.Cap.ROUND);
        paint.setStrokeJoin(Paint.Join.ROUND);
        paint.setAlpha(tool == Tool.HIGHLIGHTER ? 72 : 255);
    }

    private boolean freehand() {
        return tool == Tool.PENCIL || tool == Tool.MARKER || tool == Tool.HIGHLIGHTER || tool == Tool.ERASER;
    }

    /** The paper as it was, then the whole stroke once: no overlap, one even alpha. */
    private void renderStroke() {
        paper.drawBitmap(strokeBase, 0, 0, null);
        configure();
        paper.drawPath(stroke, paint);
    }

    private void spray(float x, float y) {
        paint.reset(); paint.setAntiAlias(true); paint.setStyle(Paint.Style.FILL); paint.setColor(ink);
        float radius = width() / 2f;
        for (int i = 0, count = Math.max(25, (int)(radius * 3)); i < count; i++) {
            float angle = random.nextFloat() * (float)(Math.PI * 2);
            float distance = (float)Math.sqrt(random.nextFloat()) * radius;
            paint.setAlpha((int)(6 + 31 * (1 - distance / radius)));
            paper.drawCircle(x + (float)Math.cos(angle) * distance, y + (float)Math.sin(angle) * distance,
                .6f + random.nextFloat() * 1.2f, paint);
        }
    }

    private static boolean near(int a, int b) {
        return Math.abs(Color.red(a) - Color.red(b)) <= FILL_TOLERANCE
            && Math.abs(Color.green(a) - Color.green(b)) <= FILL_TOLERANCE
            && Math.abs(Color.blue(a) - Color.blue(b)) <= FILL_TOLERANCE;
    }

    /**
     * Flood fill with a tolerance. An exact-match fill stopped at the first
     * anti-aliased pixel, so every filled shape kept a pale halo inside its line.
     */
    private void fill(int x, int y) {
        int original = image.getPixel(x, y);
        if (original == ink) return;
        remember();
        int[] pixels = new int[WIDTH * HEIGHT];
        image.getPixels(pixels, 0, WIDTH, 0, 0, WIDTH, HEIGHT);
        int[] stack = new int[pixels.length];
        boolean[] seen = new boolean[pixels.length];
        int top = 0, first = y * WIDTH + x;
        stack[top++] = first; seen[first] = true;
        while (top > 0) {
            int point = stack[--top];
            pixels[point] = ink;
            int px = point % WIDTH, py = point / WIDTH;
            int left = point - 1, right = point + 1, above = point - WIDTH, below = point + WIDTH;
            if (px > 0 && !seen[left] && near(pixels[left], original)) { stack[top++] = left; seen[left] = true; }
            if (px + 1 < WIDTH && !seen[right] && near(pixels[right], original)) { stack[top++] = right; seen[right] = true; }
            if (py > 0 && !seen[above] && near(pixels[above], original)) { stack[top++] = above; seen[above] = true; }
            if (py + 1 < HEIGHT && !seen[below] && near(pixels[below], original)) { stack[top++] = below; seen[below] = true; }
        }
        image.setPixels(pixels, 0, WIDTH, 0, 0, WIDTH, HEIGHT);
        saveDraft(); changed();
    }

    private void shape(float x, float y) {
        if (strokeBase == null) return;
        paper.drawBitmap(strokeBase, 0, 0, null);
        paint.reset(); paint.setAntiAlias(true); paint.setColor(ink); paint.setStyle(Paint.Style.FILL);
        float left = Math.min(startX, x), top = Math.min(startY, y);
        float right = Math.max(startX, x), bottom = Math.max(startY, y);
        if (tool == Tool.RECTANGLE) paper.drawRect(left, top, right, bottom, paint);
        else paper.drawOval(left, top, right, bottom, paint);
    }

    private void pick(float x, float y, boolean done) {
        int colour = image.getPixel((int) x, (int) y) | 0xff000000;
        ink = colour;
        if (listener != null) listener.onInkPicked(colour, done);
    }

    @Override public boolean onTouchEvent(MotionEvent event) {
        float x = coordinate(event.getX(), true), y = coordinate(event.getY(), false);
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                // Keep a parent (the page, the drawer) from taking the gesture mid-stroke.
                if (getParent() != null) getParent().requestDisallowInterceptTouchEvent(true);
                if (listener != null) listener.onTouchStart();
                drawing = false;
                if (tool == Tool.DROPPER) { pick(x, y, false); return true; }
                if (tool == Tool.FILL) { fill((int) x, (int) y); return true; }
                drawing = true;
                remember();
                strokeBase = undo.peekLast();
                startX = lastX = x; startY = lastY = y;
                if (tool == Tool.AIRBRUSH) spray(x, y);
                else if (freehand()) {
                    stroke.reset(); stroke.moveTo(x, y);
                    // A tap is a dot: a zero-length round-capped line draws nothing on its own.
                    stroke.lineTo(x + .01f, y);
                    renderStroke();
                }
                changed(); return true;
            case MotionEvent.ACTION_MOVE:
                if (tool == Tool.DROPPER) { pick(x, y, false); return true; }
                if (!drawing) return true;
                if (tool == Tool.RECTANGLE || tool == Tool.ELLIPSE) shape(x, y);
                else if (tool == Tool.AIRBRUSH) {
                    float length = (float) Math.hypot(x - lastX, y - lastY), step = Math.max(2, width() / 8f);
                    for (float d = step; d < length; d += step)
                        spray(lastX + (x - lastX) * d / length, lastY + (y - lastY) * d / length);
                    spray(x, y);
                } else {
                    // Midpoint quadratic smoothing: each sample bends the curve instead of cornering it.
                    stroke.quadTo(lastX, lastY, (x + lastX) / 2f, (y + lastY) / 2f);
                    renderStroke();
                }
                lastX = x; lastY = y; invalidate(); return true;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                if (tool == Tool.DROPPER) { pick(x, y, true); return true; }
                if (!drawing) return true;
                drawing = false;
                if (tool == Tool.RECTANGLE || tool == Tool.ELLIPSE) shape(x, y);
                else if (freehand()) { stroke.lineTo(x, y); renderStroke(); }
                strokeBase = null;
                stroke.reset();
                saveDraft(); changed(); return true;
            default: return true;
        }
    }
}
