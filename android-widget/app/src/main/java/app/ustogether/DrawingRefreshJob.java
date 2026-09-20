package app.ustogether;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;

public final class DrawingRefreshJob extends JobService {
    private static final int ID = 6241;
    static void schedule(Context context) {
        JobScheduler scheduler = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        JobInfo info = new JobInfo.Builder(ID, new ComponentName(context, DrawingRefreshJob.class))
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
            .setPeriodic(15 * 60 * 1000L)
            .setPersisted(true).build();
        scheduler.schedule(info);
    }
    static void enqueueNow(Context context) {
        JobScheduler scheduler = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        JobInfo info = new JobInfo.Builder(ID + 1, new ComponentName(context, DrawingRefreshJob.class))
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setOverrideDeadline(0).build();
        scheduler.schedule(info);
    }
    static void cancel(Context context) {
        JobScheduler scheduler = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        scheduler.cancel(ID); scheduler.cancel(ID + 1);
    }
    @Override public boolean onStartJob(JobParameters params) {
        new Thread(() -> {
            if (SessionStore.load(this) != null) {
                try { PendingDrawings.sync(this); } catch (Exception ignored) { /* Keep queued drawings for retry. */ }
                try { DrawingApi.refreshLatest(this); } catch (Exception ignored) { /* Keep the last authorized cached drawing while offline. */ }
            }
            jobFinished(params, false);
        }, "drawing-refresh").start();
        return true;
    }
    @Override public boolean onStopJob(JobParameters params) { return true; }
}
