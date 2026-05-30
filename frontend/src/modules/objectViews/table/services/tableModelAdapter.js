/**
 * Object Views table model — catalog/projection/entity adapters.
 */
export {
  buildObjectTypeTableModel,
  buildObjectTypeTableModelFromCatalog,
  findCatalogObjectType,
  getObjectTypeFields,
  normalizeViewEnginePagination,
  normalizeViewEngineSort,
} from "./adapters/ObjectTypeTableAdapter";

export {
  projectionToColumns,
  resolveProjectionFieldKeys,
} from "./adapters/projectionToColumns";

export {
  mapEntityToRow,
  mapEntitiesToRows,
  resolveEntityCellValue,
} from "./adapters/mapEntityToRow";

export { catalogFieldToFieldDef, catalogFieldsToFieldDefMap } from "./adapters/catalogFieldToFieldDef";

export { objectViewContractToLegacyProjection } from "../../services/normalizeObjectViewDefinition";
