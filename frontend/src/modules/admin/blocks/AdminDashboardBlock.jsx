import AdminDashboardPage from "../pages/AdminDashboardPage";

export default function AdminDashboardBlock() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <AdminDashboardPage />
    </div>
  );
}