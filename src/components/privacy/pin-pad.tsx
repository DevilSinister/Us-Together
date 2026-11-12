"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const HEART = "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";

/**
 * The PIN entry used to unlock a section and to set one up (ADR-053): a row of
 * dots that fill as digits go in, and a keypad of filled hearts. A hidden
 * input over the dots takes typing and pasting, so a keyboard never needs the
 * pad. The pad's bottom-left place holds `leading` (device unlock on the lock
 * screen) and its bottom-right deletes the last digit.
 */
export function PinPad({ value, onChange, length, label, disabled = false, leading }: {
  value: string; onChange: (value: string) => void; length: 4 | 6 | null; label: string; disabled?: boolean;
  /** The pad's bottom-left key, such as device unlock. */
  leading?: React.ReactNode;
}) {
  const max = length ?? 12;
  const slots = length ?? Math.max(6, value.length);
  const append = (digit: string) => { if (value.length < max) onChange(value + digit); };
  return <div className="mx-auto flex w-full max-w-[17.5rem] flex-col items-center gap-6">
    <label htmlFor="heart-pin-input" className="sr-only">{label}</label>
    <div className="relative flex min-h-11 items-center justify-center gap-3.5 rounded-control px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
      <span role="img" aria-label={`${value.length} of ${length ?? "up to 12"} digits entered`} className="flex gap-3.5">
        {Array.from({ length: slots }, (_, index) => <span key={index} className={cn("size-3.5 rounded-full transition-colors duration-150 motion-reduce:transition-none", index < value.length ? "bg-rose" : "bg-border")} />)}
      </span>
      <input id="heart-pin-input" type="password" inputMode="numeric" autoComplete="off" value={value} maxLength={max} disabled={disabled}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, max))}
        aria-describedby="heart-pin-help" className="absolute inset-0 size-full cursor-text opacity-0" />
    </div>
    <p id="heart-pin-help" className="sr-only">You can type the digits or use the keypad.</p>
    <div className="grid grid-cols-[repeat(3,5.25rem)] justify-center gap-x-3.5 gap-y-2" aria-label="PIN keypad" role="group">
      {digits.map((digit) => <DigitKey key={digit} digit={digit} onClick={() => append(digit)} disabled={disabled || value.length >= max} />)}
      <span className="grid h-[4.75rem] place-items-center">{leading}</span>
      <DigitKey digit="0" onClick={() => append("0")} disabled={disabled || value.length >= max} />
      <button type="button" aria-label="Delete the last digit" disabled={disabled || !value} onClick={() => onChange(value.slice(0, -1))}
        className="grid h-[4.75rem] w-[5.25rem] place-items-center rounded-control text-foreground transition-colors duration-150 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 motion-reduce:transition-none">
        <Delete aria-hidden="true" className="size-[1.375rem]" />
      </button>
    </div>
  </div>;
}

function DigitKey({ digit, onClick, disabled }: { digit: string; onClick: () => void; disabled: boolean }) {
  return <button type="button" aria-label={digit} onClick={onClick} disabled={disabled}
    className="group relative grid h-[4.75rem] w-[5.25rem] place-items-center pb-2 text-[1.375rem] font-semibold text-foreground transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:scale-95 disabled:opacity-50 motion-reduce:transition-none">
    <svg aria-hidden="true" viewBox="1 2 22 20" className="absolute inset-0 size-full fill-secondary transition-[fill] duration-150 group-hover:fill-[color-mix(in_oklch,var(--rose)_22%,var(--secondary))] motion-reduce:transition-none"><path d={HEART} /></svg>
    <span aria-hidden="true" className="relative">{digit}</span>
  </button>;
}
