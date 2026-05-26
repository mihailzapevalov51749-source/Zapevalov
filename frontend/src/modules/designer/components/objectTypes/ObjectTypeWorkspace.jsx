import ObjectTypeTabs from "./ObjectTypeTabs";

export default function ObjectTypeWorkspace({ header, children }) {
  return (
    <div>
      {header}
      <ObjectTypeTabs />
      {children}
    </div>
  );
}
