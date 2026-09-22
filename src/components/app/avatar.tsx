import { UserRound } from "lucide-react";
import { avatarStyleClasses, initials, type AvatarStyle } from "@/lib/avatar/styles";
import { cn } from "@/lib/utils";

const boxes = {
  xs: "size-6 text-[0.625rem]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 font-display text-2xl",
  xl: "size-24 font-display text-4xl",
} as const;

const pixels = { xs: 24, sm: 32, md: 40, lg: 64, xl: 96 } as const;

export type AvatarSize = keyof typeof boxes;

/**
 * A person, as a circle.
 *
 * The loading behaviour is structural rather than scripted: the coloured
 * initials are the background layer and the photograph paints over them when it
 * arrives. While it loads, or if it fails, or if there is no picture at all,
 * the initials are simply what you see. That is a skeleton that is never blank,
 * needs no JavaScript, cannot shift the layout, and works the same on the
 * server. Hence no state, and hence no "use client".
 *
 * No shadow. The three shadow tokens each have exactly one job - paper
 * surfaces, primary buttons, thread markers - and a one-pixel border is the
 * containment this needs. `rounded-full` is deliberate: DESIGN.md reserves it
 * for compact icons, markers and the brand emblem, and avatars join that list.
 */
export function Avatar({ name, src, style = "rose", size = "md", alt, eager = false, className }: {
  /** The already-resolved name; see lib/avatar/resolve.ts. Drives the initials. */
  name: string | null;
  /** The avatar route, with a cache-busting suffix if the caller has one. */
  src?: string | null;
  style?: AvatarStyle;
  size?: AvatarSize;
  /**
   * Pass only where the avatar stands alone. Almost every placement prints the
   * person's name beside it, and a duplicate announcement is noise, so the
   * default is decorative.
   */
  alt?: string;
  /** Set on an above-the-fold avatar; everything else lazy-loads. */
  eager?: boolean;
  className?: string;
}) {
  const mark = initials(name);
  const px = pixels[size];

  return (
    <span
      className={cn(
        "relative grid shrink-0 select-none place-items-center overflow-hidden rounded-full border font-semibold",
        boxes[size],
        avatarStyleClasses[style],
        className,
      )}
    >
      {mark
        ? <span aria-hidden={alt ? undefined : "true"}>{mark}</span>
        : <UserRound className="size-[55%]" aria-hidden="true"/>}

      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          width={px}
          height={px}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          alt={alt ?? ""}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
    </span>
  );
}
