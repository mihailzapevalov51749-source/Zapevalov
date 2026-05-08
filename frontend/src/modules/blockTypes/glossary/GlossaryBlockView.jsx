export default function GlossaryBlockView({ block }) {
  return (
    <div>
      {block?.title || "Glossary"}
    </div>
  );
}
