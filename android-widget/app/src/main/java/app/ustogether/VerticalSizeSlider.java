package app.ustogether;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.accessibility.AccessibilityNodeInfo;

/**
 * A brush-size slider that stands upright above the size button.
 *
 * A rotated SeekBar measures itself sideways and takes its touches in the wrong
 * axis, so this is drawn directly: a track that fills from the bottom, and a
 * thumb that is a preview of the brush itself, in the current ink.
 *
 * TalkBack reads it as a range and can step it with the scroll actions; a
 * keyboard steps it with the up and down arrows.
 */
final class VerticalSizeSlider extends View {
    interface OnChange { void onSize(int size); }

    static final int MIN = 1, MAX = 12;
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF track = new RectF();
    private int value = 4, ink;
    private OnChange listener;

    VerticalSizeSlider(Context context) {
        super(context);
        setFocusable(true);
        setClickable(true);
        ink = context.getColor(R.color.primary);
        setContentDescription(context.getString(R.string.editor_size_description));
    }

    void setOnChange(OnChange value) { listener = value; }
    void setInk(int colour) { ink = colour; invalidate(); }
    int getValue() { return value; }

    void setValue(int next, boolean notify) {
        next = Math.max(MIN, Math.min(MAX, next));
        if (next == value) return;
        value = next;
        invalidate();
        sendAccessibilityEvent(android.view.accessibility.AccessibilityEvent.TYPE_VIEW_SELECTED);
        if (notify && listener != null) listener.onSize(value);
    }

    private float inset() { return getContext().getResources().getDimension(R.dimen.space_5); }

    /** Bottom of the track is the smallest size, top the largest. */
    private float positionFor(int size) {
        float top = inset(), bottom = getHeight() - inset();
        return bottom - (size - MIN) / (float) (MAX - MIN) * (bottom - top);
    }

    @Override protected void onDraw(Canvas canvas) {
        float cx = getWidth() / 2f, thumb = positionFor(value);
        float half = getResources().getDimension(R.dimen.space_1) / 2f;
        track.set(cx - half, inset(), cx + half, getHeight() - inset());
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(getContext().getColor(R.color.border));
        canvas.drawRoundRect(track, half, half, paint);
        track.set(cx - half, thumb, cx + half, getHeight() - inset());
        paint.setColor(getContext().getColor(R.color.primary));
        canvas.drawRoundRect(track, half, half, paint);

        // The thumb grows with the brush, so the slider shows what it sets.
        float radius = getResources().getDimension(R.dimen.space_2) + value * getResources().getDisplayMetrics().density;
        paint.setColor(getContext().getColor(R.color.card));
        canvas.drawCircle(cx, thumb, radius + getResources().getDimension(R.dimen.stroke_selected), paint);
        paint.setColor(ink);
        canvas.drawCircle(cx, thumb, radius, paint);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(getResources().getDimension(R.dimen.stroke_hairline));
        paint.setColor(getContext().getColor(R.color.border));
        canvas.drawCircle(cx, thumb, radius, paint);
        if (isFocused()) {
            paint.setStrokeWidth(getResources().getDimension(R.dimen.stroke_selected));
            paint.setColor(getContext().getColor(R.color.ring));
            canvas.drawCircle(cx, thumb, radius + getResources().getDimension(R.dimen.space_1), paint);
        }
    }

    @Override public boolean onTouchEvent(MotionEvent event) {
        int action = event.getActionMasked();
        if (action == MotionEvent.ACTION_DOWN && getParent() != null) getParent().requestDisallowInterceptTouchEvent(true);
        if (action == MotionEvent.ACTION_DOWN || action == MotionEvent.ACTION_MOVE || action == MotionEvent.ACTION_UP) {
            float top = inset(), bottom = getHeight() - inset();
            float fraction = (bottom - Math.max(top, Math.min(bottom, event.getY()))) / (bottom - top);
            setValue(MIN + Math.round(fraction * (MAX - MIN)), true);
            if (action == MotionEvent.ACTION_UP) performClick();
        }
        return true;
    }

    @Override public boolean performClick() { return super.performClick(); }

    @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_DPAD_UP) { setValue(value + 1, true); return true; }
        if (keyCode == KeyEvent.KEYCODE_DPAD_DOWN) { setValue(value - 1, true); return true; }
        return super.onKeyDown(keyCode, event);
    }

    @Override public void onInitializeAccessibilityNodeInfo(AccessibilityNodeInfo info) {
        super.onInitializeAccessibilityNodeInfo(info);
        info.setClassName("android.widget.SeekBar");
        info.setRangeInfo(AccessibilityNodeInfo.RangeInfo.obtain(
            AccessibilityNodeInfo.RangeInfo.RANGE_TYPE_INT, MIN, MAX, value));
        if (value < MAX) info.addAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_SCROLL_FORWARD);
        if (value > MIN) info.addAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_SCROLL_BACKWARD);
    }

    @Override public boolean performAccessibilityAction(int action, Bundle arguments) {
        if (action == AccessibilityNodeInfo.ACTION_SCROLL_FORWARD) { setValue(value + 1, true); return true; }
        if (action == AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD) { setValue(value - 1, true); return true; }
        return super.performAccessibilityAction(action, arguments);
    }
}
