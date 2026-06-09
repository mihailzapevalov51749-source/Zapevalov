export default function EmbeddedPageContent({
  children,
  className = "",
  scroll = false,
  ...props
}) {
  return (
    <div
      data-embedded-page-content
      className={[
        "embedded-page-content",
        scroll ? "embedded-page-content--scroll" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
