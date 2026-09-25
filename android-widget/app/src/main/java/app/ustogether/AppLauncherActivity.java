package app.ustogether;

import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

/**
 * The launcher: the web app in a Trusted Web Activity, unchanged, except that a plain
 * launch with an update waiting asks first. Deep links from notifications and a
 * relaunch into a running app go straight through; nobody tapping "your partner sent
 * a drawing" should meet an update dialog instead.
 */
public final class AppLauncherActivity extends LauncherActivity {
    private ReleaseInfo waiting;

    @Override protected void onCreate(Bundle state) {
        Intent intent = getIntent();
        boolean plainLaunch = state == null && intent != null
            && Intent.ACTION_MAIN.equals(intent.getAction()) && intent.getData() == null;
        waiting = plainLaunch && AppUpdates.shouldPrompt(this) ? AppUpdates.available(this) : null;
        super.onCreate(state);
        UpdateCheckJob.runSoon(this);
        if (waiting != null && !isFinishing()) ask();
    }

    @Override protected boolean shouldLaunchImmediately() { return waiting == null; }

    private void ask() {
        new AlertDialog.Builder(this)
            .setTitle(R.string.update_prompt_title)
            .setMessage(getString(R.string.update_prompt_message, waiting.versionName))
            .setPositiveButton(R.string.update_now, (dialog, which) -> {
                startActivity(UpdateActivity.intent(this, true));
                finish();
            })
            .setNegativeButton(R.string.update_later, (dialog, which) -> later())
            .setOnCancelListener(dialog -> later())
            .show();
    }

    private void later() {
        if (waiting == null) return;
        AppUpdates.snooze(this, waiting);
        waiting = null;
        launchTwa();
    }
}
