import { styles } from "./usersStyles";
import updateIcon from "../../../assets/icons/update.png";

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

        <button
          type="button"
          onClick={onRefresh}
          style={styles.headerIconButton}
          title="Обновить"
        >
          <img
            src={updateIcon}
            alt=""
            style={styles.headerIcon}
          />
        </button>
      </div>
    </section>
  );
}