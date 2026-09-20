package app.ustogether;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;
import java.io.File;
import java.io.ByteArrayOutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class DrawingEditorActivity extends Activity {
    private static final int[] COLORS = {
        0xff2f2527, 0xff6f1730, 0xffe45a83, 0xfff7836b, 0xfff4a646,
        0xfff2d958, 0xff86b65b, 0xff5c8d78, 0xff50a9c5, 0xff805b9b, Color.WHITE
    };
    private static final String[] COLOR_NAMES = {
        "Ink", "Wine", "Pink", "Coral", "Orange", "Yellow",
        "Leaf", "Sage", "Sky", "Violet", "White"
    };
    private DrawingCanvasView canvas;
    private TextView selection, status;
    private String userId;
    private boolean queued;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        SessionStore.Session session = SessionStore.load(this);
        if (session == null) { finish(); return; }
        userId = session.userId;
        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(16, 16, 16, 16);
        page.setBackgroundColor(0xfffbf7f3);
        TextView title = new TextView(this);
        title.setText("Draw for your partner"); title.setTextSize(23); title.setTextColor(0xff6f1730);
        page.addView(title);
        canvas = new DrawingCanvasView(this);
        canvas.setDraft(new File(getFilesDir(), "drawing-draft-" + userId + ".png"));
        page.addView(canvas, new LinearLayout.LayoutParams(-1, 0, 1));
        selection = new TextView(this);
        selection.setText("Pencil · Wine"); selection.setTextSize(15);
        selection.setTextColor(0xff6f1730); page.addView(selection);
        HorizontalScrollView tools = new HorizontalScrollView(this);
        LinearLayout toolRow = new LinearLayout(this); toolRow.setOrientation(LinearLayout.HORIZONTAL);
        for (DrawingCanvasView.Tool tool : DrawingCanvasView.Tool.values()) {
            Button button = new Button(this);
            button.setText(tool.name().charAt(0) + tool.name().substring(1).toLowerCase());
            button.setContentDescription(button.getText() + " tool");
            button.setOnClickListener(view -> {
                canvas.setTool(tool);
                selection.setText(button.getText() + " · " + colorName(canvas.getInk()));
            });
            toolRow.addView(button);
        }
        tools.addView(toolRow); page.addView(tools);
        HorizontalScrollView colors = new HorizontalScrollView(this);
        LinearLayout colorRow = new LinearLayout(this); colorRow.setOrientation(LinearLayout.HORIZONTAL);
        for (int i = 0; i < COLORS.length; i++) {
            final int index = i;
            Button swatch = new Button(this); swatch.setText(COLOR_NAMES[i]);
            swatch.setContentDescription(COLOR_NAMES[i] + " color");
            swatch.setOnClickListener(view -> {
                canvas.setInk(COLORS[index]);
                selection.setText(canvas.getTool().name().toLowerCase() + " · " + COLOR_NAMES[index]);
            });
            colorRow.addView(swatch);
        }
        colors.addView(colorRow); page.addView(colors);
        SeekBar brushSize = new SeekBar(this);
        brushSize.setMax(11); brushSize.setProgress(3);
        brushSize.setContentDescription("Brush size");
        brushSize.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar bar, int progress, boolean fromUser) {
                canvas.setBrushSize(progress + 1);
            }
            public void onStartTrackingTouch(SeekBar bar) {}
            public void onStopTrackingTouch(SeekBar bar) {}
        });
        page.addView(brushSize);
        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        addAction(actions, "Undo", view -> canvas.undo());
        addAction(actions, "Redo", view -> canvas.redo());
        addAction(actions, "Clear", view -> new AlertDialog.Builder(this)
            .setMessage("Clear this drawing?").setNegativeButton("Cancel", null)
            .setPositiveButton("Clear", (dialog, which) -> canvas.clear()).show());
        page.addView(actions);
        status = new TextView(this); status.setTextSize(14); status.setTextColor(0xff6f1730);
        page.addView(status);
        Button send = new Button(this); send.setText("Review and queue drawing");
        send.setOnClickListener(view -> review());
        page.addView(send);
        Button home = new Button(this); home.setText("Back to Home");
        home.setOnClickListener(view -> finish()); page.addView(home);
        setContentView(page);
    }
    private void addAction(LinearLayout row, String name, View.OnClickListener listener) {
        Button button = new Button(this); button.setText(name);
        button.setOnClickListener(listener);
        row.addView(button, new LinearLayout.LayoutParams(0, -2, 1));
    }
    private String colorName(int ink) {
        for (int i = 0; i < COLORS.length; i++) if (COLORS[i] == ink) return COLOR_NAMES[i];
        return "Custom";
    }
    private void review() {
        Bitmap copy = canvas.exportSnapshot();
        status.setText("Preparing preview...");
        worker.execute(() -> {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            copy.compress(Bitmap.CompressFormat.PNG, 100, output);
            copy.recycle();
            byte[] png = output.toByteArray();
            runOnUiThread(() -> {
                if (isFinishing() || isDestroyed()) return;
                if (png.length > 2 * 1024 * 1024) {
                    status.setText("Drawing is over 2 MB. Clear some detail and try again.");
                    return;
                }
                status.setText("");
                showReview(png);
            });
        });
    }
    private void showReview(byte[] png) {
        ImageView preview = new ImageView(this);
        preview.setImageBitmap(BitmapFactory.decodeByteArray(png, 0, png.length));
        preview.setAdjustViewBounds(true);
        preview.setContentDescription("Preview of drawing to send");
        new AlertDialog.Builder(this).setTitle("Ready for your partner?")
            .setView(preview).setNegativeButton("Keep drawing", null)
            .setPositiveButton("Queue to send", (dialog, which) -> {
                try {
                    PendingDrawings.enqueue(this, userId, png);
                    queued = true;
                    canvas.discardDraft();
                    finish();
                } catch (Exception error) {
                    status.setText(error.getMessage() == null ? "Could not queue drawing." : error.getMessage());
                }
            }).show();
    }
    @Override protected void onDestroy() {
        worker.shutdown();
        super.onDestroy();
    }
    @Override protected void onPause() {
        if (canvas != null && !queued) canvas.saveDraft();
        super.onPause();
    }
}
