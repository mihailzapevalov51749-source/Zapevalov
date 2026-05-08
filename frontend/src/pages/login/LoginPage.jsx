import { useState } from "react";
import { login } from "../../api/authApi";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(email, password);
      onLogin();
    } catch (e) {
      setError(e.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f1f5f9",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 320,
          padding: 24,
          borderRadius: 12,
          background: "#ffffff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Вход</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #cbd5f5",
          }}
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #cbd5f5",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 10,
            borderRadius: 8,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Вход..." : "Войти"}
        </button>

        {error && (
          <div style={{ color: "red", fontSize: 14 }}>{error}</div>
        )}
      </form>
    </div>
  );
}