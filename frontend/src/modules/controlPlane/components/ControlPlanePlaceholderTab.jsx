import SystemMessage from "../../../system/SystemMessage";

export default function ControlPlanePlaceholderTab({ children = "Раздел в разработке" }) {
  return <SystemMessage>{children}</SystemMessage>;
}
