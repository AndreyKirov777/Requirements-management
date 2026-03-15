import Link from "next/link";

const navItems = [
  { href: "/settings/repository", label: "Repository Setup" },
  { href: "/dashboard", label: "Dashboard" }
];

export default function AppLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div style={{ minHeight: "100vh", padding: "24px" }}>
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          display: "grid",
          gap: "24px"
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            background: "rgba(255, 250, 242, 0.9)",
            border: "1px solid var(--border)",
            borderRadius: "24px",
            backdropFilter: "blur(12px)"
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--muted)" }}>
              Workspace
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: "1.75rem" }}>Requirements Management</h1>
          </div>
          <nav style={{ display: "flex", gap: "16px" }}>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} style={{ color: "var(--muted)" }}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
