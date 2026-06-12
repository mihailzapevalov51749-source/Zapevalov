import RefreshIconButton from "../../../shared/ui/RefreshIconButton";
import { companiesWorkspaceStyles as styles } from "./companiesWorkspaceStyles.js";

export default function CompaniesClientsToolbar({ onCreate, onRefresh }) {
  return (
    <div style={styles.tabToolbar}>
      <button type="button" style={styles.primaryButton} onClick={onCreate}>
        Создать компанию
      </button>
      <RefreshIconButton onClick={onRefresh} title="Обновить" />
    </div>
  );
}
