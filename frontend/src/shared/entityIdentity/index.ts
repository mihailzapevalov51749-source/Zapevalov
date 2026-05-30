export {
  ENTITY_REF_PREFIX_RUNTIME_ENTITY,
  ENTITY_REF_PREFIX_UNIVERSAL_TABLE,
  ENTITY_REF_PREFIX_UNIVERSAL_TABLE_ROW,
  ENTITY_REF_PREFIXES,
  ENTITY_REF_SEPARATOR,
} from "./entityIdentity.constants";

export type {
  EntityRefKind,
  EntityRefParseFailure,
  EntityRefParseResult,
  EntityRefParseSuccess,
  KnownEntityRefKind,
} from "./entityIdentity.types";

export {
  formatRuntimeEntityRef,
  getEntityRefKind,
  isLegacyEntityRef,
  isLegacyUniversalTableRef,
  isRuntimeEntityRef,
  parseEntityRef,
} from "./entityIdentity";

export {
  COMMUNICATION_ENTITY_TYPE_RUNTIME_ENTITY,
  isRuntimeEntityCommunicationType,
  parseLegacyUniversalTableCommunicationType,
  resolveRuntimeEntityCommunicationIdentity,
} from "./communicationIdentity";

export type { CommunicationBackendIdentity } from "./communicationIdentity";
