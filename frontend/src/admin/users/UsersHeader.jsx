import { styles } from "./usersStyles";
import updateIcon from "../../assets/icons/update.png";

export default function UsersHeader({ onRefresh, onCreate }) {
  return (
    <section style={styles.header}>
      <div style={styles.headerLeft}>
        <div style={styles.kicker}>Администрирование</div>

        <div style={styles.titleRow}>
          <h1 style={styles.title}>Пользователи</h1>

          <div style={{ display: "flex", gap: 8 }}>
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
              <img src={updateIcon} alt="" style={styles.headerIcon} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}