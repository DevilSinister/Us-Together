package app.ustogether;

import android.app.Activity;
import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.GestureDetector;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.animation.PathInterpolator;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * The native drawing editor, arranged around the paper.
 *
 * The square paper takes the width of the screen. Everything else waits in a
 * drawer underneath it: one line of tools and one line of colours, each
 * scrolling sideways, sliding up from a bar that never leaves the screen. That
 * bar holds what a drawing needs at any moment - undo, redo, clear, the drawer
 * toggle (which shows the tool and colour in hand) and, at the bottom right,
 * the brush size, which opens as an upright slider above it. "Done" sits top
 * right and sends.
 *
 * "More colours" opens a full palette screen. A colour chosen there, or read
 * off the paper with the eyedropper, takes a slot at the head of the colour line
 * so it stays one tap away.
 *
 * Every animation here is a ViewPropertyAnimator, so it follows the system's
 * animation scale: with animations removed, the drawer and palette simply
 * appear.
 */
public final class DrawingEditorActivity extends Activity implements DrawingCanvasView.Listener {
    private static final int[] COLORS = {
        0xff2f2527, 0xff6f1730, 0xffe45a83, 0xfff7836b, 0xfff4a646,
        0xfff2d958, 0xff86b65b, 0xff5c8d78, 0xff50a9c5, 0xff805b9b, Color.WHITE
    };
    private static final int[] COLOR_NAMES = {
        R.string.swatch_ink, R.string.swatch_wine, R.string.swatch_pink, R.string.swatch_coral,
        R.string.swatch_orange, R.string.swatch_yellow, R.string.swatch_leaf, R.string.swatch_sage,
        R.string.swatch_sky, R.string.swatch_violet, R.string.swatch_white
    };
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

    /** The palette screen: sixteen families, six shades each, from palest to darkest. */
    private static final int[] FAMILIES = {
        R.string.palette_greys, R.string.palette_rose, R.string.palette_red, R.string.palette_coral,
        R.string.palette_orange, R.string.palette_amber, R.string.palette_yellow, R.string.palette_lime,
        R.string.palette_green, R.string.palette_teal, R.string.palette_sky, R.string.palette_blue,
        R.string.palette_indigo, R.string.palette_violet, R.string.palette_plum, R.string.palette_brown
    };
    private static final float[] HUES = { 0, 342, 356, 10, 26, 38, 50, 78, 128, 168, 196, 214, 236, 268, 302, 24 };
    private static final int[] SHADES = {
        R.string.shade_1, R.string.shade_2, R.string.shade_3, R.string.shade_4, R.string.shade_5, R.string.shade_6
    };
    private static final float[] SATURATION = { .12f, .28f, .5f, .75f, .85f, .9f };
    private static final float[] BRIGHTNESS = { 1f, .98f, .95f, .88f, .64f, .4f };
    private static final float[] GREY = { 1f, .86f, .68f, .5f, .3f, .1f };

    private static final long SLIDE_MS = 280;
    private static final PathInterpolator EASE = new PathInterpolator(.2f, 0f, 0f, 1f);

    private final View[] toolChips = new View[TOOL_ICONS.length];
    private final Swatch[] swatches = new Swatch[COLORS.length];
    private final List<Swatch> paletteSwatches = new ArrayList<>();
    private final ExecutorService worker = Executors.newSingleThreadExecutor();

    private FrameLayout root;
    private DrawingCanvasView canvas;
    private View square, sheet, drawer, palette;
    private ImageView chevron, toolGlyph;
    private Dot inkDot, sizeDot;
    private Swatch customSwatch;
    private LinearLayout toolsToggle;
    private FrameLayout sizeButton;
    private ImageButton undoButton, redoButton;
    private Button doneButton;
    private TextView selection;
    private PopupWindow sizePopup;
    private String userId, customName = "";
    private boolean queued, sending, drawerOpen, paletteOpen;
    /** Android 13+: back closes the palette or drawer first, registered only while one is open. */
    private Object backCallback;
    private boolean backRegistered;
    /** The tool to return to after the eyedropper, and when a colour is chosen mid-erase. */
    private DrawingCanvasView.Tool inkTool = DrawingCanvasView.Tool.PENCIL;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        SessionStore.Session session = SessionStore.load(this);
        if (session == null) { finish(); return; }
        userId = session.userId;

        root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.background));
        applyInsets(root);

        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        root.addView(column, new FrameLayout.LayoutParams(-1, -1));
        column.addView(topBar());

        // The paper: square, as wide as the screen allows, never under the bar below.
        FrameLayout area = new FrameLayout(this);
        int side = dp(R.dimen.space_3);
        area.setPadding(side, dp(R.dimen.space_1), side, dp(R.dimen.space_2));
        SquareFrame frame = new SquareFrame(this);
        frame.setBackgroundResource(R.drawable.shape_panel);
        frame.setClipToOutline(true);
        canvas = new DrawingCanvasView(this);
        canvas.setContentDescription(getString(R.string.canvas_description));
        canvas.setListener(this);
        canvas.setDraft(new File(getFilesDir(), "drawing-draft-" + userId + ".png"));
        frame.addView(canvas, new FrameLayout.LayoutParams(-1, -1));
        area.addView(frame, new FrameLayout.LayoutParams(-1, -1, Gravity.TOP | Gravity.CENTER_HORIZONTAL));
        square = frame;
        column.addView(area, new LinearLayout.LayoutParams(-1, 0, 1));
        column.addView(new View(this), new LinearLayout.LayoutParams(-1, peekHeight()));

        sheet = buildSheet();
        root.addView(sheet, new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM));

        setContentView(root);
        selectTool(DrawingCanvasView.Tool.PENCIL);
        selectColor(1);
        refresh();
    }

    // ---- layout -------------------------------------------------------------------------

    private View topBar() {
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(R.dimen.space_1), dp(R.dimen.space_2), dp(R.dimen.space_3), dp(R.dimen.space_2));

        ImageButton back = iconButton(R.drawable.ic_back, R.string.editor_back, view -> finish());
        bar.addView(back);

        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        titles.setPadding(dp(R.dimen.space_1), 0, dp(R.dimen.space_2), 0);
        titles.addView(Ui.text(this, R.style.Text_Eyebrow, R.string.editor_eyebrow));
        TextView title = Ui.text(this, R.style.Text_Title, R.string.editor_title);
        title.setSingleLine(true);
        title.setEllipsize(android.text.TextUtils.TruncateAt.END);
        titles.addView(title);
        bar.addView(titles, new LinearLayout.LayoutParams(0, -2, 1));

        doneButton = Ui.button(this, R.style.Widget_UsTogether_Button_Primary, R.string.editor_done);
        doneButton.setContentDescription(getString(R.string.editor_done_description));
        doneButton.setOnClickListener(view -> send());
        bar.addView(doneButton, new LinearLayout.LayoutParams(-2, dp(R.dimen.touch_min)));
        return bar;
    }

    private int peekHeight() {
        return dp(R.dimen.space_5) + dp(R.dimen.touch_min) + dp(R.dimen.space_2);
    }

    private View buildSheet() {
        LinearLayout sheet = new LinearLayout(this);
        sheet.setOrientation(LinearLayout.VERTICAL);
        sheet.setBackgroundResource(R.drawable.shape_sheet);
        // A tap on the sheet's own paper must not fall through to the drawing below.
        sheet.setClickable(true);
        sheet.setElevation(dp(R.dimen.space_2));

        GestureDetector swipe = new GestureDetector(this, new GestureDetector.SimpleOnGestureListener() {
            @Override public boolean onDown(MotionEvent event) { return true; }
            @Override public boolean onSingleTapUp(MotionEvent event) { setDrawer(!drawerOpen); return true; }
            @Override public boolean onFling(MotionEvent start, MotionEvent end, float vx, float vy) {
                if (Math.abs(vy) <= Math.abs(vx)) return false;
                setDrawer(vy < 0);
                return true;
            }
        });

        FrameLayout handle = new FrameLayout(this);
        handle.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        View pill = new View(this);
        pill.setBackgroundResource(R.drawable.shape_handle);
        handle.addView(pill, new FrameLayout.LayoutParams(dp(R.dimen.space_8) + dp(R.dimen.space_1),
            dp(R.dimen.space_1), Gravity.CENTER));
        // A tap or an upward swipe opens the drawer; a downward swipe closes it.
        handle.setOnTouchListener((view, event) -> swipe.onTouchEvent(event));
        sheet.addView(handle, new LinearLayout.LayoutParams(-1, dp(R.dimen.space_5)));

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(R.dimen.space_2), 0, dp(R.dimen.space_2), dp(R.dimen.space_2));
        undoButton = iconButton(R.drawable.ic_undo, R.string.editor_undo, view -> canvas.undo());
        redoButton = iconButton(R.drawable.ic_redo, R.string.editor_redo, view -> canvas.redo());
        row.addView(undoButton);
        row.addView(redoButton);
        row.addView(iconButton(R.drawable.ic_clear, R.string.editor_clear, view -> {
            if (canvas.isBlank()) return;
            new AlertDialog.Builder(this)
                .setMessage(R.string.editor_clear_confirm)
                .setNegativeButton(R.string.editor_cancel, null)
                .setPositiveButton(R.string.editor_clear, (dialog, which) -> canvas.clear()).show();
        }));
        row.addView(new View(this), new LinearLayout.LayoutParams(0, 1, 1));

        // The toggle wears the tool and colour in hand, so the closed drawer still says what a stroke will do.
        toolsToggle = new LinearLayout(this);
        toolsToggle.setOrientation(LinearLayout.HORIZONTAL);
        toolsToggle.setGravity(Gravity.CENTER_VERTICAL);
        toolsToggle.setBackgroundResource(R.drawable.bg_tool_chip);
        toolsToggle.setClickable(true);
        toolsToggle.setFocusable(true);
        toolsToggle.setPadding(dp(R.dimen.space_3), 0, dp(R.dimen.space_2), 0);
        toolGlyph = new ImageView(this);
        toolGlyph.setImageTintList(getColorStateList(R.color.foreground));
        toolsToggle.addView(toolGlyph, new LinearLayout.LayoutParams(dp(R.dimen.icon_size), dp(R.dimen.icon_size)));
        inkDot = new Dot(this);
        LinearLayout.LayoutParams dotParams = new LinearLayout.LayoutParams(dp(R.dimen.space_4), dp(R.dimen.space_4));
        dotParams.leftMargin = dp(R.dimen.space_2);
        toolsToggle.addView(inkDot, dotParams);
        chevron = new ImageView(this);
        chevron.setImageResource(R.drawable.ic_chevron_up);
        chevron.setImageTintList(getColorStateList(R.color.muted_foreground));
        LinearLayout.LayoutParams chevronParams = new LinearLayout.LayoutParams(dp(R.dimen.icon_small), dp(R.dimen.icon_small));
        chevronParams.leftMargin = dp(R.dimen.space_1);
        toolsToggle.addView(chevron, chevronParams);
        toolsToggle.setOnClickListener(view -> setDrawer(!drawerOpen));
        LinearLayout.LayoutParams toggleParams = new LinearLayout.LayoutParams(-2, dp(R.dimen.touch_min));
        toggleParams.rightMargin = dp(R.dimen.space_2);
        row.addView(toolsToggle, toggleParams);

        sizeButton = new FrameLayout(this);
        sizeButton.setBackgroundResource(R.drawable.bg_tool_chip);
        sizeButton.setClickable(true);
        sizeButton.setFocusable(true);
        sizeDot = new Dot(this);
        sizeDot.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        sizeButton.addView(sizeDot, new FrameLayout.LayoutParams(-1, -1));
        sizeButton.setOnClickListener(view -> toggleSizePopup());
        row.addView(sizeButton, new LinearLayout.LayoutParams(dp(R.dimen.touch_min), dp(R.dimen.touch_min)));

        // The bar's bare paper, between its buttons, takes the same tap and swipe.
        row.setOnTouchListener((view, event) -> swipe.onTouchEvent(event));
        sheet.addView(row, new LinearLayout.LayoutParams(-1, dp(R.dimen.touch_min) + dp(R.dimen.space_2)));

        LinearLayout drawer = new LinearLayout(this);
        drawer.setOrientation(LinearLayout.VERTICAL);
        drawer.setPadding(0, 0, 0, dp(R.dimen.space_4));
        selection = Ui.text(this, R.style.Text_Caption, "");
        selection.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        selection.setPadding(dp(R.dimen.space_4), 0, dp(R.dimen.space_4), dp(R.dimen.space_2));
        drawer.addView(selection);
        drawer.addView(scroller(toolLine()));
        View colours = scroller(colourLine());
        LinearLayout.LayoutParams colourParams = new LinearLayout.LayoutParams(-1, -2);
        colourParams.topMargin = dp(R.dimen.space_2);
        drawer.addView(colours, colourParams);
        sheet.addView(drawer, new LinearLayout.LayoutParams(-1, -2));
        this.drawer = drawer;

        // Closed, the sheet sits pushed down by exactly the drawer's height. Re-apply that
        // whenever the drawer's height changes, which includes its first layout.
        drawer.setVisibility(View.INVISIBLE);
        drawer.addOnLayoutChangeListener((view, l, t, r, b, ol, ot, or, ob) -> {
            if (b - t != ob - ot && !drawerOpen) sheet.setTranslationY(b - t);
        });
        return sheet;
    }

    private HorizontalScrollView scroller(View content) {
        HorizontalScrollView scroll = new HorizontalScrollView(this);
        scroll.setHorizontalScrollBarEnabled(false);
        scroll.setClipToPadding(false);
        scroll.setPadding(dp(R.dimen.space_3), 0, dp(R.dimen.space_3), 0);
        scroll.addView(content);
        return scroll;
    }

    private View toolLine() {
        LinearLayout line = new LinearLayout(this);
        line.setOrientation(LinearLayout.HORIZONTAL);
        DrawingCanvasView.Tool[] tools = DrawingCanvasView.Tool.values();
        for (int i = 0; i < tools.length; i++) {
            final DrawingCanvasView.Tool tool = tools[i];
            LinearLayout chip = new LinearLayout(this);
            chip.setOrientation(LinearLayout.VERTICAL);
            chip.setGravity(Gravity.CENTER);
            chip.setBackgroundResource(R.drawable.bg_tool_chip);
            chip.setClickable(true);
            chip.setFocusable(true);
            int pad = dp(R.dimen.space_2);
            chip.setPadding(pad, pad, pad, pad);
            chip.setContentDescription(getString(TOOL_NAMES[i]));

            ImageView glyph = new ImageView(this);
            glyph.setImageResource(TOOL_ICONS[i]);
            glyph.setImageTintList(getColorStateList(R.color.tool_chip_content));
            glyph.setDuplicateParentStateEnabled(true);
            chip.addView(glyph, new LinearLayout.LayoutParams(dp(R.dimen.icon_size), dp(R.dimen.icon_size)));
            TextView label = Ui.text(this, R.style.Text_Caption, getString(TOOL_SHORT[i]));
            label.setTextColor(getColorStateList(R.color.tool_chip_content));
            label.setDuplicateParentStateEnabled(true);
            label.setSingleLine(true);
            label.setGravity(Gravity.CENTER);
            chip.addView(label);

            chip.setOnClickListener(view -> selectTool(tool));
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                dp(R.dimen.space_10) + dp(R.dimen.space_8) + dp(R.dimen.space_1), -2);
            params.rightMargin = dp(R.dimen.space_2);
            line.addView(chip, params);
            toolChips[i] = chip;
        }
        return line;
    }

    private View colourLine() {
        LinearLayout line = new LinearLayout(this);
        line.setOrientation(LinearLayout.HORIZONTAL);
        line.setGravity(Gravity.CENTER_VERTICAL);
        customSwatch = new Swatch(this, Color.BLACK);
        customSwatch.setVisibility(View.GONE);
        customSwatch.setOnClickListener(view -> chooseInk(customSwatch.colour, customName));
        line.addView(customSwatch, swatchParams());
        for (int i = 0; i < COLORS.length; i++) {
            final int index = i;
            Swatch swatch = new Swatch(this, COLORS[i]);
            swatch.setContentDescription(getString(R.string.editor_swatch_description, getString(COLOR_NAMES[i])));
            swatch.setOnClickListener(view -> chooseInk(COLORS[index], getString(COLOR_NAMES[index])));
            line.addView(swatch, swatchParams());
            swatches[i] = swatch;
        }
        ImageButton more = iconButton(R.drawable.ic_palette, R.string.editor_more_colours, view -> openPalette());
        more.setBackgroundResource(R.drawable.bg_tool_chip);
        LinearLayout.LayoutParams moreParams = new LinearLayout.LayoutParams(dp(R.dimen.touch_min), dp(R.dimen.touch_min));
        moreParams.leftMargin = dp(R.dimen.space_2);
        line.addView(more, moreParams);
        return line;
    }

    private LinearLayout.LayoutParams swatchParams() {
        int size = dp(R.dimen.touch_min) + dp(R.dimen.space_1);
        return new LinearLayout.LayoutParams(size, size);
    }

    // ---- the drawer ---------------------------------------------------------------------

    private void setDrawer(boolean open) {
        if (open == drawerOpen) return;
        drawerOpen = open;
        if (sizePopup != null) sizePopup.dismiss();
        if (open) drawer.setVisibility(View.VISIBLE);
        sheet.animate().cancel();
        sheet.animate().translationY(open ? 0 : drawer.getHeight()).setDuration(SLIDE_MS).setInterpolator(EASE)
            .withEndAction(() -> { if (!drawerOpen) drawer.setVisibility(View.INVISIBLE); }).start();
        chevron.animate().rotation(open ? 180 : 0).setDuration(SLIDE_MS).setInterpolator(EASE).start();
        refresh();
        updateBack();
    }

    /** Close the drawer when a stroke starts, but only if the open drawer covers part of the paper. */
    @Override public void onTouchStart() {
        if (sizePopup != null) sizePopup.dismiss();
        if (!drawerOpen) return;
        int[] paper = new int[2], drawerTop = new int[2];
        square.getLocationOnScreen(paper);
        sheet.getLocationOnScreen(drawerTop);
        if (drawerTop[1] < paper[1] + square.getHeight()) setDrawer(false);
    }

    // ---- tools and colours --------------------------------------------------------------

    private void selectTool(DrawingCanvasView.Tool tool) {
        canvas.setTool(tool);
        if (tool != DrawingCanvasView.Tool.DROPPER && tool != DrawingCanvasView.Tool.ERASER) inkTool = tool;
        for (int i = 0; i < toolChips.length; i++) toolChips[i].setSelected(i == tool.ordinal());
        refresh();
    }

    /** One colour selected at a time; the fixed swatches, or the slot for a chosen one. */
    private void selectColor(int index) {
        for (int i = 0; i < swatches.length; i++) swatches[i].setSelected(i == index);
        customSwatch.setSelected(index < 0);
    }

    private void chooseInk(int colour, String name) {
        canvas.setInk(colour);
        int index = indexOf(colour);
        if (index < 0) {
            customName = name;
            customSwatch.setColour(colour);
            customSwatch.setContentDescription(getString(R.string.editor_swatch_description, name));
            customSwatch.setVisibility(View.VISIBLE);
        }
        selectColor(index);
        // A colour chosen mid-erase means "draw with this", so the eraser hands back its brush.
        if (canvas.getTool() == DrawingCanvasView.Tool.ERASER || canvas.getTool() == DrawingCanvasView.Tool.DROPPER)
            selectTool(inkTool);
        refresh();
    }

    private static int indexOf(int colour) {
        for (int i = 0; i < COLORS.length; i++) if (COLORS[i] == colour) return i;
        return -1;
    }

    private String colourName(int ink) {
        int index = indexOf(ink);
        if (index >= 0) return getString(COLOR_NAMES[index]);
        return customName.isEmpty() ? getString(R.string.editor_custom_colour) : customName;
    }

    @Override public void onHistoryChanged() { refresh(); }

    @Override public void onInkPicked(int colour, boolean done) {
        if (!done) { inkDot.set(colour, 0); return; }
        chooseInk(colour, getString(R.string.editor_picked_colour));
    }

    /** Everything that shows the current state, in one place so nothing drifts. */
    private void refresh() {
        DrawingCanvasView.Tool tool = canvas.getTool();
        int ink = canvas.getInk(), size = canvas.getBrushSize();
        String state = getString(R.string.editor_selection, getString(TOOL_NAMES[tool.ordinal()]), colourName(ink));
        selection.setText(state);
        toolGlyph.setImageResource(TOOL_ICONS[tool.ordinal()]);
        inkDot.set(tool == DrawingCanvasView.Tool.ERASER ? Color.WHITE : ink, 0);
        sizeDot.set(ink, size);
        toolsToggle.setContentDescription(getString(drawerOpen ? R.string.editor_tools_hide : R.string.editor_tools_show, state));
        sizeButton.setContentDescription(getString(R.string.editor_size_button, size));
        enable(undoButton, canvas.canUndo());
        enable(redoButton, canvas.canRedo());
    }

    private static void enable(View view, boolean enabled) {
        view.setEnabled(enabled);
        view.setAlpha(enabled ? 1f : .38f);
    }

    // ---- brush size ---------------------------------------------------------------------

    private void toggleSizePopup() {
        if (sizePopup != null && sizePopup.isShowing()) { sizePopup.dismiss(); return; }
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER_HORIZONTAL);
        box.setBackgroundResource(R.drawable.shape_popup);
        box.setPadding(dp(R.dimen.space_2), dp(R.dimen.space_3), dp(R.dimen.space_2), dp(R.dimen.space_2));

        TextView value = Ui.text(this, R.style.Text_Label, getString(R.string.editor_size_value, canvas.getBrushSize()));
        value.setGravity(Gravity.CENTER);
        value.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        box.addView(value, new LinearLayout.LayoutParams(-1, -2));

        VerticalSizeSlider slider = new VerticalSizeSlider(this);
        slider.setValue(canvas.getBrushSize(), false);
        slider.setInk(canvas.getInk());
        slider.setOnChange(size -> {
            canvas.setBrushSize(size);
            value.setText(getString(R.string.editor_size_value, size));
            refresh();
        });
        box.addView(slider, new LinearLayout.LayoutParams(dp(R.dimen.touch_min) + dp(R.dimen.space_2),
            dp(R.dimen.space_10) * 5 + dp(R.dimen.space_5)));

        sizePopup = new PopupWindow(box, ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, true);
        sizePopup.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        sizePopup.setOutsideTouchable(true);
        sizePopup.setElevation(dp(R.dimen.space_2));
        sizePopup.setAnimationStyle(android.R.style.Animation_Dialog);
        box.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED);
        int[] anchor = new int[2];
        sizeButton.getLocationInWindow(anchor);
        int x = anchor[0] + sizeButton.getWidth() - box.getMeasuredWidth();
        int y = anchor[1] - box.getMeasuredHeight() - dp(R.dimen.space_2);
        sizePopup.showAtLocation(root, Gravity.NO_GRAVITY, x, Math.max(0, y));
        slider.requestFocus();
    }

    // ---- the palette screen -------------------------------------------------------------

    private void openPalette() {
        if (palette == null) {
            palette = buildPalette();
            root.addView(palette, new FrameLayout.LayoutParams(-1, -1));
        }
        int ink = canvas.getInk();
        for (Swatch swatch : paletteSwatches) swatch.setSelected(swatch.colour == ink);
        paletteOpen = true;
        updateBack();
        palette.setVisibility(View.VISIBLE);
        palette.setTranslationY(root.getHeight());
        palette.animate().cancel();
        palette.animate().translationY(0).setDuration(SLIDE_MS + 40).setInterpolator(EASE).start();
    }

    private void closePalette() {
        if (palette == null || !paletteOpen) return;
        paletteOpen = false;
        updateBack();
        palette.animate().cancel();
        palette.animate().translationY(root.getHeight()).setDuration(SLIDE_MS).setInterpolator(EASE)
            .withEndAction(() -> palette.setVisibility(View.GONE)).start();
    }

    private View buildPalette() {
        LinearLayout screen = new LinearLayout(this);
        screen.setOrientation(LinearLayout.VERTICAL);
        screen.setBackgroundColor(getColor(R.color.background));
        screen.setClickable(true);
        screen.setElevation(dp(R.dimen.space_4));

        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(R.dimen.space_1), dp(R.dimen.space_2), dp(R.dimen.space_4), dp(R.dimen.space_2));
        bar.addView(iconButton(R.drawable.ic_back, R.string.palette_close, view -> closePalette()));
        TextView title = Ui.text(this, R.style.Text_Title, R.string.palette_title);
        title.setPadding(dp(R.dimen.space_1), 0, 0, 0);
        bar.addView(title);
        screen.addView(bar);

        ScrollView scroll = new ScrollView(this);
        LinearLayout list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setPadding(dp(R.dimen.space_4), 0, dp(R.dimen.space_4), dp(R.dimen.space_8));
        for (int family = 0; family < FAMILIES.length; family++) {
            TextView label = Ui.text(this, R.style.Text_Label, FAMILIES[family]);
            label.setPadding(0, dp(R.dimen.space_4), 0, dp(R.dimen.space_1));
            list.addView(label);
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            for (int shade = 0; shade < SHADES.length; shade++) {
                int colour = paletteColour(family, shade);
                String name = getString(R.string.palette_swatch, getString(FAMILIES[family]), getString(SHADES[shade]));
                Swatch swatch = new Swatch(this, colour);
                swatch.setContentDescription(name);
                swatch.setOnClickListener(view -> { chooseInk(colour, name); closePalette(); });
                row.addView(swatch, new LinearLayout.LayoutParams(0, dp(R.dimen.touch_min) + dp(R.dimen.space_2), 1));
                paletteSwatches.add(swatch);
            }
            list.addView(row);
        }
        scroll.addView(list);
        screen.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        return screen;
    }

    private static int paletteColour(int family, int shade) {
        if (family == 0) {
            int grey = Math.round(GREY[shade] * 255);
            return Color.rgb(grey, grey, grey);
        }
        boolean brown = family == FAMILIES.length - 1;
        float saturation = SATURATION[shade] * (brown ? .75f : 1f);
        float brightness = BRIGHTNESS[shade] * (brown ? .78f : 1f);
        return Color.HSVToColor(new float[] { HUES[family], saturation, brightness });
    }

    // ---- sending ------------------------------------------------------------------------

    /** Done sends: the drawing goes to the outbox, which delivers it when there is a connection. */
    private void send() {
        if (sending) return;
        if (canvas.isBlank()) { toast(getString(R.string.editor_empty)); return; }
        sending = true;
        doneButton.setEnabled(false);
        Bitmap copy = canvas.exportSnapshot();
        worker.execute(() -> {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            copy.compress(Bitmap.CompressFormat.PNG, 100, output);
            copy.recycle();
            byte[] png = output.toByteArray();
            runOnUiThread(() -> {
                if (isFinishing() || isDestroyed()) return;
                if (png.length > 2 * 1024 * 1024) { failed(getString(R.string.editor_too_large)); return; }
                try {
                    PendingDrawings.enqueue(this, userId, png);
                    queued = true;
                    canvas.discardDraft();
                    toast(getString(R.string.editor_queued));
                    finish();
                } catch (Exception error) {
                    failed(error.getMessage() == null ? getString(R.string.editor_queue_failed) : error.getMessage());
                }
            });
        });
    }

    private void failed(String message) {
        sending = false;
        doneButton.setEnabled(true);
        toast(message);
    }

    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_SHORT).show(); }

    // ---- plumbing -----------------------------------------------------------------------

    private int dp(int dimen) { return Ui.dp(this, dimen); }

    private ImageButton iconButton(int icon, int label, View.OnClickListener listener) {
        ImageButton button = new ImageButton(this, null, 0, R.style.Widget_UsTogether_IconButton);
        button.setImageResource(icon);
        button.setImageTintList(getColorStateList(R.color.foreground));
        button.setContentDescription(getString(label));
        button.setOnClickListener(listener);
        return button;
    }

    /**
     * From Android 15 this app is drawn edge to edge, so the bars' space is claimed
     * here; below that the window already sits between the bars and the insets are zero.
     */
    private static void applyInsets(View view) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return;
        view.setOnApplyWindowInsetsListener((target, insets) -> {
            android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            target.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsets.CONSUMED;
        });
    }

    /** Closes what is open above the paper; false when there is nothing, so back leaves. */
    private boolean closeOverlay() {
        if (paletteOpen) { closePalette(); return true; }
        if (drawerOpen) { setDrawer(false); return true; }
        return false;
    }

    private void updateBack() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
        boolean wanted = paletteOpen || drawerOpen;
        if (backCallback == null) backCallback = (android.window.OnBackInvokedCallback) this::closeOverlay;
        android.window.OnBackInvokedCallback callback = (android.window.OnBackInvokedCallback) backCallback;
        if (wanted && !backRegistered) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, callback);
            backRegistered = true;
        } else if (!wanted && backRegistered) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(callback);
            backRegistered = false;
        }
    }

    /**
     * The path for devices where back still arrives here: before Android 13, and later
     * versions running the legacy back dispatch. Predictive back uses {@link #updateBack}.
     */
    @SuppressLint("GestureBackNavigation")
    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() {
        if (!closeOverlay()) super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (sizePopup != null) sizePopup.dismiss();
        worker.shutdown();
        super.onDestroy();
    }

    @Override protected void onPause() {
        if (canvas != null && !queued) canvas.saveDraft();
        super.onPause();
    }

    /** Lays out a square: the smaller of the space offered across and down. */
    private static final class SquareFrame extends FrameLayout {
        SquareFrame(Context context) { super(context); }
        @Override protected void onMeasure(int widthSpec, int heightSpec) {
            int side = Math.min(MeasureSpec.getSize(widthSpec), MeasureSpec.getSize(heightSpec));
            int exact = MeasureSpec.makeMeasureSpec(side, MeasureSpec.EXACTLY);
            super.onMeasure(exact, exact);
        }
    }

    /**
     * A colour, with a ring when selected. White carries a permanent hairline or
     * it vanishes against card paper.
     */
    private static final class Swatch extends View {
        private int colour;
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        Swatch(Context context, int colour) {
            super(context);
            this.colour = colour;
            setClickable(true);
            setFocusable(true);
        }

        void setColour(int value) { colour = value; invalidate(); }

        @Override public void setSelected(boolean selected) { super.setSelected(selected); invalidate(); }

        @Override protected void onDraw(android.graphics.Canvas canvas) {
            float cx = getWidth() / 2f, cy = getHeight() / 2f;
            float radius = Math.min(Ui.dp(getContext(), R.dimen.swatch_size) / 2f,
                Math.min(getWidth(), getHeight()) / 2f - Ui.dp(getContext(), R.dimen.space_1) * 1.5f);
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

    /**
     * The colour in hand, drawn at the brush's size when there is one. Size 0 is a
     * plain colour chip.
     */
    private static final class Dot extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private int colour = Color.BLACK, size;

        Dot(Context context) { super(context); }

        void set(int colour, int size) { this.colour = colour; this.size = size; invalidate(); }

        @Override protected void onDraw(android.graphics.Canvas canvas) {
            float full = Math.min(getWidth(), getHeight()) / 2f;
            float density = getResources().getDisplayMetrics().density;
            float radius = size == 0 ? full - density : Math.min(full - density * 6, density * (3 + size * 1.25f));
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(colour);
            canvas.drawCircle(getWidth() / 2f, getHeight() / 2f, radius, paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(density);
            paint.setColor(getContext().getColor(R.color.border));
            canvas.drawCircle(getWidth() / 2f, getHeight() / 2f, radius, paint);
        }
    }
}
