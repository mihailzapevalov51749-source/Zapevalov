import { FileText, Folder } from "lucide-react";
import { buildTrashDependencyTreeLines } from "../../services/trashDependencyPresentation";

function formatTreePath(path) {
  if (!Array.isArray(path) || path.length === 0) {
    return "";
  }
  return path.join(" → ");
}

export default function TrashPurgeDependencyTree({ tree }) {
  const lines = buildTrashDependencyTreeLines(tree);
  if (!lines.length) {
    return null;
  }

  return (
    <section
      className="designer-trash-purge-tree designer-trash-purge-tree--panel"
      aria-label="Дерево зависимостей"
    >
      <h4 className="designer-trash-purge-tree__title">Дерево зависимостей</h4>
      <ul className="designer-trash-purge-tree__list">
        {lines.map((line) => {
          const pathText = formatTreePath(line.path);
          const isRoot = line.depth === 0;
          return (
            <li
              key={line.key}
              className={`designer-trash-purge-tree__item${
                isRoot ? " designer-trash-purge-tree__item--root" : ""
              }`}
              style={{ paddingLeft: `${line.depth * 16}px` }}
            >
              <span className="designer-trash-purge-tree__icon" aria-hidden="true">
                {isRoot ? <Folder size={14} /> : <FileText size={14} />}
              </span>
              <span className="designer-trash-purge-tree__label">
                {line.depth > 0 ? (
                  <>
                    <span className="designer-trash-purge-tree__branch">{line.prefix} </span>
                    {line.label}
                    {pathText ? (
                      <span className="designer-trash-purge-tree__path"> — {pathText}</span>
                    ) : null}
                  </>
                ) : (
                  line.label
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
