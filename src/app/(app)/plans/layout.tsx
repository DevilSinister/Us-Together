import { LockGate } from "@/components/privacy/lock-gate";

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <LockGate area="plans">{children}</LockGate>;
}
