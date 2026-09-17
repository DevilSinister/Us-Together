"use client";

import { Heart, Delete } from "lucide-react";

const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function PinPad({ value, onChange, length, label, disabled = false }: {
  value: string; onChange: (value: string) => void; length: 4 | 6 | null; label: string; disabled?: boolean;
}) {
  const max = length ?? 12;
  const slots = length ?? Math.max(6, value.length);
  const append = (digit: string) => { if (value.length < max) onChange(value + digit); };
  return <div className="mx-auto w-full max-w-[19rem]">
    <label htmlFor="heart-pin-input" className="block text-center text-sm font-medium">{label}</label>
    <div className="relative mt-5 flex min-h-14 items-center justify-center gap-2 rounded-control focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
      {Array.from({ length: slots }, (_, index) => <Heart key={index} aria-hidden="true" className={`size-5 ${index < value.length ? "fill-primary text-primary" : "text-muted-foreground/50"}`} />)}
      <input id="heart-pin-input" type="password" inputMode="numeric" autoComplete="off" value={value} maxLength={max} disabled={disabled}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, max))}
        aria-label={label} aria-describedby="heart-pin-help" className="absolute inset-0 size-full cursor-text opacity-0" />
    </div>
    <p id="heart-pin-help" className="mt-1 text-center text-xs text-muted-foreground">{value.length} of {length ?? "up to 12"} digits entered. You can type or use the heart buttons.</p>
    <div className="mt-5 grid grid-cols-3 place-items-center gap-x-2 gap-y-1" aria-label="PIN keypad">
      {digits.map((digit) => <DigitButton key={digit} digit={digit} onClick={() => append(digit)} disabled={disabled || value.length >= max} />)}
      <span aria-hidden="true" />
      <DigitButton digit="0" onClick={() => append("0")} disabled={disabled || value.length >= max} />
      <button type="button" aria-label="Delete last digit" disabled={disabled || !value} onClick={() => onChange(value.slice(0, -1))}
        className="flex size-16 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"><Delete aria-hidden="true" className="size-6" /></button>
    </div>
  </div>;
}

function DigitButton({ digit, onClick, disabled }: { digit: string; onClick: () => void; disabled: boolean }) {
  return <button type="button" aria-label={`Digit ${digit}`} onClick={onClick} disabled={disabled}
    className="relative flex size-[4.5rem] items-center justify-center rounded-full text-primary transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:scale-95 disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:scale-100">
    <Heart aria-hidden="true" className="absolute inset-0 size-full fill-[color-mix(in_oklch,var(--primary)_16%,var(--card))] stroke-primary/65 stroke-[1.4]" />
    <span aria-hidden="true" className="relative z-10 pt-2 text-xl font-semibold text-foreground">{digit}</span>
  </button>;
}
