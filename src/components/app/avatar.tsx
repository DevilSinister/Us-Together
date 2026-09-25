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

/**
 * The two of you, one face tucked behind the other.
 *
 * Both faces come from the resolved identities, so the partner is always the
 * name and picture chosen in Settings. The ring in the page colour is what
 * separates the overlap; it is a border, not a shadow.
 */
const overlaps = { xs: "-ml-2", sm: "-ml-2.5", md: "-ml-3", lg: "-ml-5", xl: "-ml-7" } as const;

export function AvatarPair({ me, partner, size = "sm", className }: {
  me: { name: string; src: string | null; style: AvatarStyle };
  partner: { name: string; src: string | null; style: AvatarStyle };
  size?: AvatarSize;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <Avatar name={me.name} src={me.src} style={me.style} size={size} className="ring-2 ring-background" />
      <Avatar name={partner.name} src={partner.src} style={partner.style} size={size} className={cn(overlaps[size], "ring-2 ring-background")} />
    </span>
  );
}
