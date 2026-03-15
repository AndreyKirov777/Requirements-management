export default function DashboardPage() {
  return (
    <section
      style={{
        padding: "32px",
        borderRadius: "24px",
        background: "var(--surface)",
        border: "1px solid var(--border)"
      }}
    >
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <p style={{ color: "var(--muted)", marginBottom: 0 }}>
        Repository onboarding is the only active flow in Story 1.1. Requirement synchronization appears in later stories.
      </p>
    </section>
  );
}
