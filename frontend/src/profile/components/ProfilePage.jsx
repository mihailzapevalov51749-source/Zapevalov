import { useEffect, useState } from "react";
import { getMe, updateMe, logout } from "../../api/authApi";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const data = await getMe();
      setUser(data);
      setForm(data);
    } catch (e) {
      setError("Ошибка загрузки профиля");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setError("");
      const updated = await updateMe(form);
      setUser(updated);
      setForm(updated);
      setIsEdit(false);
    } catch (e) {
      setError("Ошибка сохранения");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Загрузка...</div>;
  }

  return (
    <div
      style={{
        padding: 40,
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginBottom: 24 }}>Личный кабинет</h1>

      {error && (
        <div style={{ color: "red", marginBottom: 16 }}>{error}</div>
      )}

      {/* Профиль */}
      <div style={card}>
        <h2>Профиль</h2>

        <div style={grid}>
          <Field
            label="ФИО"
            value={form.full_name}
            onChange={(v) => handleChange("full_name", v)}
            disabled={!isEdit}
          />

          <Field label="Email" value={form.email} disabled />

          <Field
            label="Телефон"
            value={form.phone}
            onChange={(v) => handleChange("phone", v)}
            disabled={!isEdit}
          />

          <Field
            label="Должность"
            value={form.position}
            onChange={(v) => handleChange("position", v)}
            disabled={!isEdit}
          />

          <Field
            label="Подразделение"
            value={form.department}
            onChange={(v) => handleChange("department", v)}
            disabled={!isEdit}
          />

          <Field label="Роль" value={user.role} disabled />
        </div>
      </div>

      {/* Кнопки */}
      <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
        {!isEdit && (
          <button style={primary} onClick={() => setIsEdit(true)}>
            Редактировать
          </button>
        )}

        {isEdit && (
          <>
            <button style={primary} onClick={handleSave}>
              Сохранить
            </button>

            <button style={secondary} onClick={() => setIsEdit(false)}>
              Отмена
            </button>
          </>
        )}

        <button style={danger} onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 13, color: "#64748b" }}>{label}</label>

      <input
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          height: 36,
          padding: "0 10px",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          background: disabled ? "#f1f5f9" : "#fff",
        }}
      />
    </div>
  );
}

const card = {
  padding: 20,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#fff",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  marginTop: 16,
};

const primary = {
  height: 36,
  padding: "0 16px",
  borderRadius: 8,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
};

const secondary = {
  height: 36,
  padding: "0 16px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
};

const danger = {
  height: 36,
  padding: "0 16px",
  borderRadius: 8,
  border: "none",
  background: "#dc2626",
  color: "#fff",
  cursor: "pointer",
};