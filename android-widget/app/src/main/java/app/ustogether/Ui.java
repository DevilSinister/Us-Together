package app.ustogether;

import android.content.Context;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Construction helpers so the native screens speak the same design language as
 * the web app.
 *
 * These screens build their view trees in code, so before this existed every
 * colour was a literal and every padding was a raw pixel int - a setPadding(28)
 * reads as about 9dp on a three-times-density phone, which is why the whole
 * app sat cramped. Everything here resolves through res/values, so the tokens,
 * the type scale and values-night all apply the same way they would in XML.
 *
 * The four-argument View constructors take a style resource directly, which is
 * the programmatic equivalent of style="@style/..." in a layout.
 */
final class Ui {
    private Ui() {}

    static int dp(Context context, int dimen) {
        return context.getResources().getDimensionPixelSize(dimen);
    }

    static TextView text(Context context, int styleRes, CharSequence value) {
        TextView view = new TextView(context, null, 0, styleRes);
        view.setText(value);
        return view;
    }

    static TextView text(Context context, int styleRes, int stringRes) {
        return text(context, styleRes, context.getString(stringRes));
    }

    static android.widget.Button button(Context context, int styleRes, int stringRes) {
        android.widget.Button view = new android.widget.Button(context, null, 0, styleRes);
        view.setText(stringRes);
        return view;
    }

    static EditText field(Context context, int hintRes, int inputType) {
        EditText view = new EditText(context, null, 0, R.style.Widget_UsTogether_Field);
        view.setHint(hintRes);
        view.setInputType(inputType);
        // Stated here too: with defStyleAttr 0 nothing else guarantees a tap focuses the field.
        view.setFocusable(true);
        view.setFocusableInTouchMode(true);
        view.setClickable(true);
        return view;
    }

    /** A one-pixel rule, the way borders carry structure everywhere in this product. */
    static View divider(Context context) {
        View view = new View(context);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(context, R.dimen.stroke_hairline));
        params.topMargin = dp(context, R.dimen.space_6);
        params.bottomMargin = dp(context, R.dimen.space_6);
        view.setLayoutParams(params);
        view.setBackgroundColor(context.getColor(R.color.border));
        return view;
    }

    /** Vertical rhythm between stacked children. */
    static <T extends View> T spaced(Context context, T view, int topDimen) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.topMargin = dp(context, topDimen);
        view.setLayoutParams(params);
        return view;
    }

    /** A blush grouping panel: quiet context, never an accent. */
    static LinearLayout panel(Context context) {
        LinearLayout group = new LinearLayout(context);
        group.setOrientation(LinearLayout.VERTICAL);
        group.setBackgroundResource(R.drawable.shape_blush_panel);
        int pad = dp(context, R.dimen.space_5);
        group.setPadding(pad, dp(context, R.dimen.space_4), pad, dp(context, R.dimen.space_4));
        return group;
    }
}
