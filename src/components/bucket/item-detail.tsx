"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Edit3, GripVertical, Plus, Trash2 } from "lucide-react";

import { mutateBucket } from "@/app/actions/bucket";
import { moveSubtask, subtaskProgress, type BucketItem, type BucketList, type BucketSubtask } from "@/lib/bucket/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ItemEditor } from "./item-editor";

export function ItemDetail({
  item,
  subtasks,
  lists = [],
  categories = [],
}: {
  item: BucketItem;
  subtasks: BucketSubtask[];
  lists?: BucketList[];
  categories?: readonly string[] | string[];
}) {

  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editPending, setEditPending] = useState(false);

  const progress = subtaskProgress(subtasks);

  function submit(command: unknown, success: string, after?: () => void) {
    start(async () => {
      try {
        const result = await mutateBucket(command);
        setMessage(result.ok ? success : result.message);
        if (result.ok) {
          router.refresh();
          after?.();
        }
      } catch {
        setMessage("Connection interrupted. Try again when you are online.");
      }
    });
  }

  function step(
    kind: "add" | "update" | "delete" | "reorder",
    task: BucketSubtask | null,
    label = "",
    completed = false,
    orderedIds: string[] = []
  ) {
    submit(
      {
        operation: "subtask",
        id: item.id,
        version: item.version,
        kind,
        subtaskId: task?.id ?? null,
        label,
        completed,
        orderedIds,
      },
      kind === "reorder" ? "Step order saved." : "Steps updated."
    );
  }

  const editIdea = (
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Edit3 className="size-4" />
          Edit the idea
        </Button>
      </DialogTrigger>
      <DialogContent title="Edit bucket idea" className="max-w-2xl" dismissible={!editPending}>
        <DialogHeader>
          <DialogTitle>Edit the idea</DialogTitle>
          <DialogDescription>
            Refine your shared plans, timing, location, or details.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <ItemEditor
            lists={lists}
            item={item}
            categories={categories}
            key={item.version}
            onSaved={() => setEditOpen(false)}
            onCancel={() => setEditOpen(false)}
            onPendingChange={setEditPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div>
      {/* Top Action Buttons */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {item.status === "completed" ? (
          <section className="w-full rounded-2xl bg-secondary p-6">
            <h2 className="font-display text-3xl">One more dream lived.</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Completion is saved. Your story can follow when you are ready.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/memories/new?bucket=${item.id}`}>Save this as a memory</Link>
              </Button>
              {editIdea}
            </div>
          </section>
        ) : (
          <>
            <Button asChild>
              <Link href={`/plans/new?bucket=${item.id}`}>Plan this</Link>
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                submit(
                  { operation: "completeItem", id: item.id, version: item.version },
                  "One more dream lived. Completion saved."
                )
              }
            >
              <Check className="size-4" />
              Mark complete
            </Button>

            {/* Edit Idea Modal Trigger Button */}
            {editIdea}
          </>
        )}
      </div>

      <p role="status" className={deleteOpen ? "sr-only" : "mt-5 min-h-6 text-sm text-primary"} aria-hidden={deleteOpen || undefined}>
        {pending ? "Saving…" : message}
      </p>

      {/* Little Steps Section */}
      <section className="mt-7 border-t pt-7" aria-labelledby="steps-title">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="steps-title" className="font-display text-3xl">
            Little steps
          </h2>
          <p className="text-sm text-muted-foreground">
            {progress.completed} of {progress.total} complete
          </p>
        </div>

        <progress
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
          aria-label="Subtask progress"
          value={progress.completed}
          max={Math.max(1, progress.total)}
        />

        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Use the arrows to reorder steps, or drag a handle on desktop. Each idea can hold 50 steps.
        </p>

        {/* Compact Draggable List View */}
        <div className="mt-4 rounded-xl border border-border bg-card/60 divide-y divide-border overflow-hidden">
          {subtasks.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">No steps added yet. Add a small step below to get started.</p>
          ) : (
            subtasks.map((task, index) => (
              <div
                key={task.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromIndex = subtasks.findIndex((candidate) => candidate.id === e.dataTransfer.getData("application/x-us-together-step"));
                  if (pending || fromIndex < 0 || fromIndex === index) return;
                  const newOrdered = [...subtasks.map((t) => t.id)];
                  const [moved] = newOrdered.splice(fromIndex, 1);
                  newOrdered.splice(index, 0, moved);
                  step("reorder", null, "", false, newOrdered);
                }}
                className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-x-1 px-2 py-2 lg:flex lg:gap-2 lg:px-3 hover:bg-secondary/40 transition-colors"
              >
                {/* Drag Handle */}
                <div
                  draggable={!pending}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-us-together-step", task.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  aria-hidden="true"
                  className="hidden size-11 shrink-0 place-items-center cursor-grab active:cursor-grabbing text-muted-foreground lg:grid"
                  title="Drag to reorder"
                >
                  <GripVertical className="size-4" />
                </div>

                {/* Checkbox */}
                <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
                  <input
                    type="checkbox"
                    className="size-4.5 accent-primary rounded cursor-pointer"
                    aria-label={`Complete ${task.label}`}
                    checked={task.is_completed}
                    disabled={pending}
                    onChange={(event) =>
                      step("update", task, task.label, event.target.checked)
                    }
                  />
                </label>

                {/* Inline Editable Form */}
                <form
                  className="flex flex-1 items-center gap-2 min-w-0"
                  onSubmit={(event) => {
                    event.preventDefault();
                    step(
                      "update",
                      task,
                      String(new FormData(event.currentTarget).get("label")),
                      task.is_completed
                    );
                  }}
                >
                  <Input
                    name="label"
                    aria-label={`Step ${index + 1}`}
                    defaultValue={task.label}
                    key={task.label}
                    required
                    maxLength={240}
                    disabled={pending}
                    className={`min-h-11 text-base sm:text-sm px-2.5 border-transparent bg-transparent hover:border-border hover:bg-field/80 focus:border-border focus:bg-field transition-colors ${
                      task.is_completed ? "line-through text-muted-foreground" : ""
                    }`}
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 shrink-0 px-3 text-sm text-primary"
                    aria-label="Save step"
                    disabled={pending}
                  >
                    Save
                  </Button>
                </form>

                {/* Keyboard / Compact Actions */}
                <div className="contents lg:flex lg:shrink-0 lg:items-center lg:gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className="hidden size-11 p-0 text-muted-foreground hover:text-foreground lg:inline-flex"
                    disabled={pending || index === 0}
                    aria-label={`Move ${task.label} up`}
                    onClick={() =>
                      step(
                        "reorder",
                        null,
                        "",
                        false,
                        moveSubtask(
                          subtasks.map((t) => t.id),
                          task.id,
                          -1
                        )
                      )
                    }
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className="hidden size-11 p-0 text-muted-foreground hover:text-foreground lg:inline-flex"
                    disabled={pending || index === subtasks.length - 1}
                    aria-label={`Move ${task.label} down`}
                    onClick={() =>
                      step(
                        "reorder",
                        null,
                        "",
                        false,
                        moveSubtask(
                          subtasks.map((t) => t.id),
                          task.id,
                          1
                        )
                      )
                    }
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className="col-start-3 row-start-1 size-11 p-0 text-muted-foreground hover:text-danger lg:col-auto lg:row-auto"
                    disabled={pending}
                    aria-label={`Remove step ${task.label}`}
                    onClick={() => step("delete", task)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Step Form */}
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const label = String(new FormData(form).get("label"));
            submit(
              {
                operation: "subtask",
                id: item.id,
                version: item.version,
                kind: "add",
                subtaskId: null,
                label,
                completed: false,
                orderedIds: [],
              },
              "Step added.",
              () => form.reset()
            );
          }}
        >
          <label className="flex-1 space-y-1.5 text-xs font-semibold">
            <span className="text-muted-foreground">Next little step</span>
            <Input
              name="label"
              aria-label="Next little step"
              required
              maxLength={240}
              placeholder="What would bring this closer?"
            />
          </label>
          <Button variant="outline" size="sm" className="min-h-11 px-4" disabled={pending || subtasks.length >= 50}>
            <Plus className="size-4" />
            Add step
          </Button>
        </form>
      </section>


      {/* Danger Zone: Delete Idea Button with Modal */}
      <section className="mt-10 border-t pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Delete this idea</h3>
            <p className="text-sm text-muted-foreground">
              Permanently remove this idea and its steps.
            </p>
          </div>
          <Dialog open={deleteOpen} onOpenChange={(next) => { setDeleteOpen(next); setMessage(""); }}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="size-4" />
                Delete this idea
              </Button>
            </DialogTrigger>
            <DialogContent title="Delete idea permanently" dismissible={!pending}>
              <DialogHeader>
                <DialogTitle>Delete this idea</DialogTitle>
                <DialogDescription>
                  This permanently removes <strong>&ldquo;{item.title}&rdquo;</strong> and its steps
                  from your shared bucket list. Existing plans and memories are kept, but their link to this
                  idea is removed.
                </DialogDescription>
              </DialogHeader>
              <form
                className="mt-4 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  submit(
                    {
                      operation: "deleteItem",
                      id: item.id,
                      version: item.version,
                      confirmation: new FormData(event.currentTarget).get("confirmation"),
                    },
                    "Idea deleted.",
                    () => {
                      setDeleteOpen(false);
                      router.push("/bucket");
                    }
                  );
                }}
              >
                <label className="block space-y-2 text-sm font-semibold">
                  Type DELETE to confirm
                  <Input
                    name="confirmation"
                    aria-label="Type DELETE to confirm"
                    required
                    pattern="DELETE"
                    placeholder="DELETE"
                  />
                </label>
                <p role="status" className="text-sm leading-6 text-primary">{pending ? "Deleting…" : message}</p>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setDeleteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending}
                    className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                  >
                    Delete idea permanently
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
}
