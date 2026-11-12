/** The signed-out screens draw their own cover and sheet (`AuthShell`); the layout only gives them a main landmark. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main id="main">{children}</main>;
}
