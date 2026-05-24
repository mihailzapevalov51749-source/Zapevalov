import AdminLauncherCard from "./AdminLauncherCard";

export default function AdminDashboardGrid({
  sections = [],
  onNavigate,
}) {
  return (
    <div style={gridStyle}>
      {sections.map((section) => (
        <AdminLauncherCard
          key={section.id}
          title={section.title}
          subtitle={section.subtitle}
          description={section.description}
          actionLabel={section.actionLabel}
          metrics={section.metrics}
          previewTitle={section.previewTitle}
          previewItems={section.previewItems}
          route={section.route}
          icon={section.icon}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
  alignItems: "stretch",
  width: "100%",
};