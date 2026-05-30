import { styles } from "./usersStyles";
import RefreshIconButton from "../../../shared/ui/RefreshIconButton";

export default function UsersHeader({
  onRefresh,
  onCreate,
}) {
  return (
    <section style={styles.header}>
      <div style={styles.headerActions}>
        <button
          type="button"
          onClick={onCreate}
          style={styles.headerIconButton}
          title="Добавить пользователя"
        >
          +
        </button>

        <RefreshIconButton onClick={onRefresh} title="Обновить" />
      </div>
    </section>
  );
}