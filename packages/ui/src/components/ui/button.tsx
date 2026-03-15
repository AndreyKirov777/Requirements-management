import * as React from "react";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function Button({ style, ...props }, ref) {
  return (
    <button
      ref={ref}
      style={{
        border: "none",
        borderRadius: "999px",
        padding: "12px 18px",
        background: "var(--accent)",
        color: "var(--accent-contrast)",
        cursor: "pointer",
        ...style
      }}
      {...props}
    />
  );
});
