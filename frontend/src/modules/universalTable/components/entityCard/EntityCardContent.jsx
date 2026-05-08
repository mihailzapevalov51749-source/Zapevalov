import {
  entityCardContentWrapperStyle,
  entityCardContentInnerStyle,
} from "./styles/entityCardContentStyles";

export default function EntityCardContent({
  children,
}) {
  return (
    <div style={entityCardContentWrapperStyle}>
      <div style={entityCardContentInnerStyle}>
        {children}
      </div>
    </div>
  );
}