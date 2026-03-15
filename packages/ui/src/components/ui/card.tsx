import * as React from "react";

export function Card({
  children,
  style
}: Readonly<{ children: React.ReactNode; style?: React.CSSProperties }>) {
  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "24px",
        padding: "24px",
        ...style
      }}
    >
      {children}
    </section>
  );
}
