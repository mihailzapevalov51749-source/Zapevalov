export default function AdminOrgStructurePage() {
  return (
    <AdminPageShell
      title="Оргструктура"
      description="Настройка организационной иерархии, руководителей и связей подчинения."
    />
  );
}

function AdminPageShell({ title, description }) {
  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.kicker}>Администрирование</div>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.description}>{description}</p>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: 32,
    boxSizing: "border-box",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 28,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
  },
  kicker: {
    fontSize: 13,
    fontWeight: 700,
    color: "#2563eb",
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: 28,
    color: "#0f172a",
  },
  description: {
    marginTop: 10,
    marginBottom: 0,
    fontSize: 15,
    color: "#64748b",
  },
};