export default function AdminRolesPage({ variant = "tenant" }) {
  const isPlatform = variant === "platform";

  return (
    <AdminPageShell
      kicker={isPlatform ? "Управление платформой" : "Администрирование компании"}
      title={isPlatform ? "Роли платформы" : "Роли и доступы"}
      description={
        isPlatform
          ? "Глобальные роли, права доступа и политики безопасности платформы."
          : "Управление ролями, правами доступа и полномочиями пользователей."
      }
    />
  );
}

function AdminPageShell({ kicker, title, description }) {
  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.kicker}>{kicker}</div>
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