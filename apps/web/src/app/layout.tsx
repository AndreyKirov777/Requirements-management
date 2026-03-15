import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Requirements Management",
  description: "Project and repository onboarding for requirements synchronization."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
