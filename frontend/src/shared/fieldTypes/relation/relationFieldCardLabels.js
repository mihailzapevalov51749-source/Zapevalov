export function resolveRelationFieldAddLabel({ cardinality, hasLinks }) {
  const isMany = String(cardinality) === "many";

  if (isMany) {
    return "+ Добавить связь";
  }

  return hasLinks ? "Заменить связь" : "Добавить связь";
}

export function canAddRelationFieldLink({ cardinality, itemCount }) {
  const isMany = String(cardinality) === "many";
  return isMany || itemCount === 0;
}
