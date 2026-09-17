package app.ustogether.widget;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.view.MotionEvent;
import android.view.View;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.ArrayDeque;
import java.util.Random;

final class DrawingCanvasView extends View {
    static final int WIDTH = 640, HEIGHT = 480;
    enum Tool { PENCIL, MARKER, HIGHLIGHTER, AIRBRUSH, FILL, RECTANGLE, ELLIPSE, DROPPER, ERASER }
    private final Bitmap image = Bitmap.createBitmap(WIDTH, HEIGHT, Bitmap.Config.ARGB_8888);
    private final Canvas paper = new Canvas(image);
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Random random = new Random();
    private final ArrayDeque<Bitmap> undo = new ArrayDeque<>(), redo = new ArrayDeque<>();
    private Tool tool = Tool.PENCIL;
    private int ink = Color.rgb(111, 23, 48), size = 4;
    private float lastX, lastY, startX, startY;
    private Bitmap shapeBase;
    private Runnable changeListener;
    private File draft;
    private boolean drawing;
    private final ExecutorService draftWorker = Executors.newSingleThreadExecutor();
    private volatile long draftGeneration;

    DrawingCanvasView(Context context) {
        super(context);
        paper.drawColor(Color.WHITE);
        setContentDescription("Drawing canvas");
    }
    void setChangeListener(Runnable listener) { changeListener = listener; }
    void setTool(Tool value) { tool = value; }
    Tool getTool() { return tool; }
    void setInk(int value) { ink = value; }
    int getInk() { return ink; }
    void setBrushSize(int value) { size = Math.max(1, Math.min(12, value)); }
    void setDraft(File file) {
        draft = file;
        if (file.exists()) {
            Bitmap saved = BitmapFactory.decodeFile(file.getAbsolutePath());
            if (saved != null && saved.getWidth() == WIDTH && saved.getHeight() == HEIGHT) {
                paper.drawBitmap(saved, 0, 0, null);
                saved.recycle();
                invalidate();
            }
        }
    }
    private void changed() {
        invalidate();
        if (changeListener != null) changeListener.run();
    }
    private Bitmap snapshot() { return image.copy(Bitmap.Config.ARGB_8888, false); }
    private void remember() {
        undo.addLast(snapshot());
        if (undo.size() > 20) undo.removeFirst().recycle();
        while (!redo.isEmpty()) redo.removeLast().recycle();
    }
    void undo() {
        if (undo.isEmpty()) return;
        redo.addLast(snapshot());
        Bitmap previous = undo.removeLast();
        paper.drawBitmap(previous, 0, 0, null);
        previous.recycle();
        saveDraft(); changed();
    }
    void redo() {
        if (redo.isEmpty()) return;
        undo.addLast(snapshot());
        Bitmap next = redo.removeLast();
        paper.drawBitmap(next, 0, 0, null);
        next.recycle();
        saveDraft(); changed();
    }
    void clear() {
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
    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float scale = Math.min(getWidth() / (float) WIDTH, getHeight() / (float) HEIGHT);
        float left = (getWidth() - WIDTH * scale) / 2f, top = (getHeight() - HEIGHT * scale) / 2f;
        canvas.drawColor(Color.rgb(245, 223, 226));
        canvas.drawBitmap(image, null, new android.graphics.RectF(left, top, left + WIDTH * scale, top + HEIGHT * scale), null);
    }
    private float coordinate(float value, boolean x) {
        float scale = Math.min(getWidth() / (float) WIDTH, getHeight() / (float) HEIGHT);
        float inset = ((x ? getWidth() : getHeight()) - (x ? WIDTH : HEIGHT) * scale) / 2f;
        return Math.max(0, Math.min((x ? WIDTH : HEIGHT) - 1, (value - inset) / scale));
    }
    private float width() {
        switch (tool) {
            case PENCIL: return Math.max(1, size * .65f);
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
        paint.setAlpha(tool == Tool.HIGHLIGHTER ? 61 : 255);
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
    private void fill(int x, int y) {
        int original = image.getPixel(x, y);
        if (original == ink) return;
        remember();
        int[] pixels = new int[WIDTH * HEIGHT];
        image.getPixels(pixels, 0, WIDTH, 0, 0, WIDTH, HEIGHT);
        int[] stack = new int[pixels.length];
        boolean[] queued = new boolean[pixels.length];
        int top = 0, first = y * WIDTH + x;
        stack[top++] = first; queued[first] = true;
        while (top > 0) {
            int point = stack[--top];
            pixels[point] = ink;
            int px = point % WIDTH, py = point / WIDTH;
            int left = point - 1, right = point + 1, above = point - WIDTH, below = point + WIDTH;
            if (px > 0 && !queued[left] && pixels[left] == original) { stack[top++] = left; queued[left] = true; }
            if (px + 1 < WIDTH && !queued[right] && pixels[right] == original) { stack[top++] = right; queued[right] = true; }
            if (py > 0 && !queued[above] && pixels[above] == original) { stack[top++] = above; queued[above] = true; }
            if (py + 1 < HEIGHT && !queued[below] && pixels[below] == original) { stack[top++] = below; queued[below] = true; }
        }
        image.setPixels(pixels, 0, WIDTH, 0, 0, WIDTH, HEIGHT);
        saveDraft(); changed();
    }
    private void shape(float x, float y) {
        if (shapeBase == null) return;
        paper.drawBitmap(shapeBase, 0, 0, null);
        paint.reset(); paint.setAntiAlias(true); paint.setColor(ink); paint.setStyle(Paint.Style.FILL);
        float left = Math.min(startX, x), top = Math.min(startY, y);
        float right = Math.max(startX, x), bottom = Math.max(startY, y);
        if (tool == Tool.RECTANGLE) paper.drawRect(left, top, right, bottom, paint);
        else paper.drawOval(left, top, right, bottom, paint);
    }
    @Override public boolean onTouchEvent(MotionEvent event) {
        float x = coordinate(event.getX(), true), y = coordinate(event.getY(), false);
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                drawing = false;
                if (tool == Tool.DROPPER) { ink = image.getPixel((int)x, (int)y); changed(); return true; }
                if (tool == Tool.FILL) { fill((int)x, (int)y); return true; }
                drawing = true;
                remember(); startX = lastX = x; startY = lastY = y;
                if (tool == Tool.RECTANGLE || tool == Tool.ELLIPSE) shapeBase = snapshot();
                else if (tool == Tool.AIRBRUSH) spray(x, y);
                else { configure(); paint.setStyle(Paint.Style.FILL); paper.drawCircle(x, y, width() / 2f, paint); }
                changed(); return true;
            case MotionEvent.ACTION_MOVE:
                if (!drawing) return true;
                if (tool == Tool.RECTANGLE || tool == Tool.ELLIPSE) shape(x, y);
                else if (tool == Tool.AIRBRUSH) {
                    float length = (float)Math.hypot(x - lastX, y - lastY), step = Math.max(2, width() / 8f);
                    for (float d = step; d < length; d += step)
                        spray(lastX + (x - lastX) * d / length, lastY + (y - lastY) * d / length);
                    spray(x, y);
                } else {
                    configure(); paper.drawLine(lastX, lastY, x, y, paint);
                }
                lastX = x; lastY = y; changed(); return true;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                if (!drawing) return true;
                drawing = false;
                if (tool == Tool.RECTANGLE || tool == Tool.ELLIPSE) shape(x, y);
                if (shapeBase != null) { shapeBase.recycle(); shapeBase = null; }
                saveDraft(); changed(); return true;
            default: return true;
        }
    }
}
