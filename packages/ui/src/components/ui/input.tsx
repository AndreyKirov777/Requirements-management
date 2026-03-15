import * as React from "react";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ style, ...props }, ref) {
  return (
    <input
      ref={ref}
      style={{
        width: "100%",
        borderRadius: "14px",
        border: "1px solid var(--border)",
        background: "#fffdf9",
        padding: "12px 14px",
        ...style
      }}
      {...props}
    />
  );
});
