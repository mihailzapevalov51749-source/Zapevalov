import AdminSystemPage from "../system/AdminSystemPage";

export default function AdminSystemBlock() {
  return (
    <div
      style={{
        width: "100%",
        height: "auto",
        minHeight: "100%",
        overflow: "visible",
        boxSizing: "border-box",
      }}
    >
      <AdminSystemPage />
    </div>
  );
}