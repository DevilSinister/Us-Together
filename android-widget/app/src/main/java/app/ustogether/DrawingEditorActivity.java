package app.ustogether;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.GridLayout;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;
import java.io.File;
import java.io.ByteArrayOutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * The native drawing editor.
 *
 * Tools used to be nine text buttons in a horizontal scroller, and colours were
 * eleven buttons labelled with the *names* of colours. Both are now what they
 * describe: a grid of icon chips, and a grid of real swatches. The colour name
 * survives as the accessible name, which is what it was always good for - a
 * screen reader needs "Sage", a sighted user needs to see sage.
 *
 * Selection rides on setSelected, so the colour state lists paint the selected
 * chip and TalkBack announces "selected" without a line of Java doing either.
 */
public final class DrawingEditorActivity extends Activity {
    private static final int[] COLORS = {
        0xff2f2527, 0xff6f1730, 0xffe45a83, 0xfff7836b, 0xfff4a646,
        0xfff2d958, 0xff86b65b, 0xff5c8d78, 0xff50a9c5, 0xff805b9b, Color.WHITE
    };
    private static final int[] COLOR_NAMES = {
        R.string.swatch_ink, R.string.swatch_wine, R.string.swatch_pink, R.string.swatch_coral,
        R.string.swatch_orange, R.string.swatch_yellow, R.string.swatch_leaf, R.string.swatch_sage,
        R.string.swatch_sky, R.string.swatch_violet, R.string.swatch_white
    };
    /** Icon, full accessible name, and the short label the chip actually shows. */
    private static final int[] TOOL_ICONS = {
        R.drawable.ic_tool_pencil, R.drawable.ic_tool_marker, R.drawable.ic_tool_highlighter,
        R.drawable.ic_tool_airbrush, R.drawable.ic_tool_fill, R.drawable.ic_tool_rectangle,
        R.drawable.ic_tool_ellipse, R.drawable.ic_tool_dropper, R.drawable.ic_tool_eraser
    };
    private static final int[] TOOL_NAMES = {
        R.string.tool_pencil, R.string.tool_marker, R.string.tool_highlighter,
        R.string.tool_airbrush, R.string.tool_fill, R.string.tool_rectangle,
        R.string.tool_ellipse, R.string.tool_dropper, R.string.tool_eraser
    };
    private static final int[] TOOL_SHORT = {
        R.string.tool_pencil_short, R.string.tool_marker_short, R.string.tool_highlighter_short,
        R.string.tool_airbrush_short, R.string.tool_fill_short, R.string.tool_rectangle_short,
        R.string.tool_ellipse_short, R.string.tool_dropper_short, R.string.tool_eraser_short
    };

    private final View[] toolChips = new View[TOOL_ICONS.length];
    private final View[] swatches = new View[COLORS.length];
    private View sizeDot;
    /** Mirrors the slider, because the canvas exposes no getter for it. */
    private int brushSize = 4;
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
        int gutter = Ui.dp(this, R.dimen.space_4);
        page.setPadding(gutter, Ui.dp(this, R.dimen.space_6), gutter, gutter);
        page.setBackgroundColor(getColor(R.color.background));

        page.addView(Ui.text(this, R.style.Text_Eyebrow, R.string.editor_eyebrow));
        page.addView(Ui.spaced(this, Ui.text(this, R.style.Text_Title, R.string.editor_title), R.dimen.space_1));

        // The canvas sits on a bounded mat with the panel radius, the way the
        // web drawing workspace frames its paper.
        LinearLayout mat = new LinearLayout(this);
        mat.setBackgroundResource(R.drawable.shape_panel);
        mat.setClipToOutline(true);
        canvas = new DrawingCanvasView(this);
        canvas.setContentDescription(getString(R.string.canvas_description));
        canvas.setDraft(new File(getFilesDir(), "drawing-draft-" + userId + ".png"));
        mat.addView(canvas, new LinearLayout.LayoutParams(-1, -1));
        LinearLayout.LayoutParams matParams = new LinearLayout.LayoutParams(-1, 0, 1);
        matParams.topMargin = Ui.dp(this, R.dimen.space_4);
        page.addView(mat, matParams);

        selection = Ui.text(this, R.style.Text_Caption, "");
        // The web editor announces its selected tool; this screen had no live
        // region at all.
        selection.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        page.addView(Ui.spaced(this, selection, R.dimen.space_3));

        GridLayout toolGrid = new GridLayout(this);
        toolGrid.setColumnCount(5);
        DrawingCanvasView.Tool[] tools = DrawingCanvasView.Tool.values();
        for (int i = 0; i < tools.length; i++) {
            final int index = i;
            final DrawingCanvasView.Tool tool = tools[i];
            LinearLayout chip = new LinearLayout(this);
            chip.setOrientation(LinearLayout.VERTICAL);
            chip.setGravity(Gravity.CENTER);
            chip.setBackgroundResource(R.drawable.bg_tool_chip);
            chip.setClickable(true);
            chip.setFocusable(true);
            chip.setMinimumHeight(Ui.dp(this, R.dimen.touch_min));
            int pad = Ui.dp(this, R.dimen.space_2);
            chip.setPadding(pad, pad, pad, pad);
            // The chip shows the short label and announces the full one.
            chip.setContentDescription(getString(TOOL_NAMES[i]));

            ImageView glyph = new ImageView(this);
            glyph.setImageResource(TOOL_ICONS[i]);
            glyph.setImageTintList(getColorStateList(R.color.tool_chip_content));
            glyph.setDuplicateParentStateEnabled(true);
            chip.addView(glyph, new LinearLayout.LayoutParams(
                Ui.dp(this, R.dimen.icon_size), Ui.dp(this, R.dimen.icon_size)));

            TextView label = Ui.text(this, R.style.Text_Caption, getString(TOOL_SHORT[i]));
            label.setTextColor(getColorStateList(R.color.tool_chip_content));
            label.setDuplicateParentStateEnabled(true);
            label.setGravity(Gravity.CENTER);
            chip.addView(label);

            chip.setOnClickListener(view -> { canvas.setTool(tool); selectTool(index); });

            GridLayout.LayoutParams params = new GridLayout.LayoutParams();
            params.width = 0;
            params.columnSpec = GridLayout.spec(i % 5, 1f);
            int margin = Ui.dp(this, R.dimen.space_1);
            params.setMargins(margin, margin, margin, margin);
            toolGrid.addView(chip, params);
            toolChips[i] = chip;
        }
        page.addView(Ui.spaced(this, toolGrid, R.dimen.space_3));

        GridLayout colorGrid = new GridLayout(this);
        colorGrid.setColumnCount(6);
        for (int i = 0; i < COLORS.length; i++) {
            final int index = i;
            Swatch swatch = new Swatch(this, COLORS[i]);
            swatch.setContentDescription(getString(R.string.editor_swatch_description, getString(COLOR_NAMES[i])));
            swatch.setOnClickListener(view -> { canvas.setInk(COLORS[index]); selectColor(index); });
            GridLayout.LayoutParams params = new GridLayout.LayoutParams();
            params.width = Ui.dp(this, R.dimen.touch_min);
            params.height = Ui.dp(this, R.dimen.touch_min);
            params.columnSpec = GridLayout.spec(i % 6);
            colorGrid.addView(swatch, params);
            swatches[i] = swatch;
        }
        page.addView(Ui.spaced(this, colorGrid, R.dimen.space_2));

        LinearLayout sizeRow = new LinearLayout(this);
        sizeRow.setOrientation(LinearLayout.HORIZONTAL);
        sizeRow.setGravity(Gravity.CENTER_VERTICAL);
        sizeRow.addView(Ui.text(this, R.style.Text_Label, R.string.editor_size));

        SeekBar sizeSlider = new SeekBar(this);
        sizeSlider.setMax(11);
        sizeSlider.setProgress(3);
        sizeSlider.setContentDescription(getString(R.string.editor_size_description));
        sizeSlider.setProgressTintList(getColorStateList(R.color.primary));
        sizeSlider.setThumbTintList(getColorStateList(R.color.primary));
        sizeSlider.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar bar, int progress, boolean fromUser) {
                brushSize = progress + 1;
                canvas.setBrushSize(brushSize);
                showSize(brushSize);
            }
            public void onStartTrackingTouch(SeekBar bar) {}
            public void onStopTrackingTouch(SeekBar bar) {}
        });
        LinearLayout.LayoutParams seekParams = new LinearLayout.LayoutParams(0, -2, 1);
        seekParams.leftMargin = Ui.dp(this, R.dimen.space_3);
        seekParams.rightMargin = Ui.dp(this, R.dimen.space_3);
        sizeRow.addView(sizeSlider, seekParams);

        // A live preview of the brush, so the slider position means something.
        // The slider already announces its value, so this is decorative.
        LinearLayout dotWell = new LinearLayout(this);
        dotWell.setGravity(Gravity.CENTER);
        dotWell.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        sizeDot = new View(this);
        dotWell.addView(sizeDot, new LinearLayout.LayoutParams(
            Ui.dp(this, R.dimen.space_3), Ui.dp(this, R.dimen.space_3)));
        sizeRow.addView(dotWell, new LinearLayout.LayoutParams(
            Ui.dp(this, R.dimen.space_8), Ui.dp(this, R.dimen.space_8)));
        page.addView(Ui.spaced(this, sizeRow, R.dimen.space_3));

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        addAction(actions, R.drawable.ic_undo, R.string.editor_undo, view -> canvas.undo());
        addAction(actions, R.drawable.ic_redo, R.string.editor_redo, view -> canvas.redo());
        addAction(actions, R.drawable.ic_clear, R.string.editor_clear, view -> new AlertDialog.Builder(this)
            .setMessage(R.string.editor_clear_confirm)
            .setNegativeButton(R.string.editor_cancel, null)
            .setPositiveButton(R.string.editor_clear, (dialog, which) -> canvas.clear()).show());
        page.addView(Ui.spaced(this, actions, R.dimen.space_2));

        status = Ui.text(this, R.style.Text_Caption, "");
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        page.addView(Ui.spaced(this, status, R.dimen.space_2));

        Button send = Ui.button(this, R.style.Widget_UsTogether_Button_Primary, R.string.editor_send);
        send.setOnClickListener(view -> review());
        page.addView(Ui.spaced(this, send, R.dimen.space_3));

        Button home = Ui.button(this, R.style.Widget_UsTogether_Button_Ghost, R.string.editor_back);
        home.setOnClickListener(view -> finish());
        page.addView(Ui.spaced(this, home, R.dimen.space_1));

        setContentView(page);
        selectTool(0);
        selectColor(1);
    }

    /** One selected chip at a time; the platform announces the change. */
    private void selectTool(int index) {
        for (int i = 0; i < toolChips.length; i++) toolChips[i].setSelected(i == index);
        describeSelection();
    }

    private void selectColor(int index) {
        for (int i = 0; i < swatches.length; i++) swatches[i].setSelected(i == index);
        describeSelection();
        showSize(brushSize);
    }

    private void describeSelection() {
        selection.setText(getString(R.string.editor_selection,
            getString(TOOL_NAMES[canvas.getTool().ordinal()]), colorName(canvas.getInk())));
    }

    private void showSize(int size) {
        GradientDrawable dot = new GradientDrawable();
        dot.setShape(GradientDrawable.OVAL);
        dot.setColor(canvas.getInk());
        sizeDot.setBackground(dot);
        int px = Ui.dp(this, R.dimen.space_1) + size * 2;
        sizeDot.getLayoutParams().width = px;
        sizeDot.getLayoutParams().height = px;
        sizeDot.requestLayout();
    }

    private void addAction(LinearLayout row, int icon, int label, View.OnClickListener listener) {
        ImageButton button = new ImageButton(this, null, 0, R.style.Widget_UsTogether_IconButton);
        button.setImageResource(icon);
        button.setImageTintList(getColorStateList(R.color.foreground));
        button.setContentDescription(getString(label));
        button.setOnClickListener(listener);
        row.addView(button);
    }

    private String colorName(int ink) {
        for (int i = 0; i < COLORS.length; i++) if (COLORS[i] == ink) return getString(COLOR_NAMES[i]);
        return "";
    }

    /**
     * The colour itself, with a ring when selected. White carries a permanent
     * hairline or it vanishes against card paper.
     */
    private static final class Swatch extends View {
        private final int colour;
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        Swatch(Context context, int colour) {
            super(context);
            this.colour = colour;
            setClickable(true);
            setFocusable(true);
        }

        @Override protected void onDraw(android.graphics.Canvas canvas) {
            float cx = getWidth() / 2f, cy = getHeight() / 2f;
            float radius = Ui.dp(getContext(), R.dimen.swatch_size) / 2f;
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(colour);
            canvas.drawCircle(cx, cy, radius, paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(Ui.dp(getContext(), R.dimen.stroke_hairline));
            paint.setColor(getContext().getColor(R.color.border));
            canvas.drawCircle(cx, cy, radius, paint);
            if (isSelected()) {
                paint.setStrokeWidth(Ui.dp(getContext(), R.dimen.stroke_selected));
                paint.setColor(getContext().getColor(R.color.primary));
                canvas.drawCircle(cx, cy, radius + Ui.dp(getContext(), R.dimen.space_1), paint);
            }
        }
    }

    private void review() {
        Bitmap copy = canvas.exportSnapshot();
        status.setText(R.string.editor_preparing);
        worker.execute(() -> {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            copy.compress(Bitmap.CompressFormat.PNG, 100, output);
            copy.recycle();
            byte[] png = output.toByteArray();
            runOnUiThread(() -> {
                if (isFinishing() || isDestroyed()) return;
                if (png.length > 2 * 1024 * 1024) {
                    status.setText(R.string.editor_too_large);
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
        preview.setContentDescription(getString(R.string.editor_preview_description));
        new AlertDialog.Builder(this).setTitle(R.string.editor_review_title)
            .setView(preview).setNegativeButton(R.string.editor_keep_drawing, null)
            .setPositiveButton(R.string.editor_queue, (dialog, which) -> {
                try {
                    PendingDrawings.enqueue(this, userId, png);
                    queued = true;
                    canvas.discardDraft();
                    finish();
                } catch (Exception error) {
                    status.setText(error.getMessage() == null ? getString(R.string.editor_queue_failed) : error.getMessage());
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
