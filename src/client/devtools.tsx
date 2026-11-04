import { lazy, Suspense, type ComponentType, type ReactNode } from "react";

const Panels: ComponentType | null = import.meta.env.DEV
  ? lazy(() => import("./devtools-panels"))
  : null;

export function Devtools(): ReactNode {
  if (!Panels) return null;

  return (
    <Suspense fallback={null}>
      <Panels />
    </Suspense>
  );
}
