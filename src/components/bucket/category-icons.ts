import {
  Clapperboard, Coffee, Flag, Gamepad2, Heart, Mountain, Music, Palette, Plane, Sofa, Tag, UtensilsCrossed, type LucideIcon,
} from "lucide-react";
import type { CategoryMark } from "@/lib/bucket/grouping";

/** The mark an idea's category is drawn with, on the list and anywhere an idea is named. */
export const categoryIcons: Record<CategoryMark, LucideIcon> = {
  travel: Plane, food: UtensilsCrossed, ritual: Coffee, outdoors: Mountain, home: Sofa,
  culture: Palette, milestone: Flag, romance: Heart, film: Clapperboard, music: Music,
  games: Gamepad2, other: Tag,
};
