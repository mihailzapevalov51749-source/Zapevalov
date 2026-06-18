import { platformEnvironmentsStyles as styles } from "./platformEnvironmentsStyles.js";

export default function EnvironmentsList({
  environments,
  loading,
  selectedEnvironmentId,
  onSelect,
}) {
  return (
    <div style={styles.listPanel}>
      <div style={styles.listHeader}>Инфраструктурные среды</div>

      <div style={styles.listBody}>
        {loading ? <div style={styles.emptyState}>Загрузка...</div> : null}

        {!loading && environments.length === 0 ? (
          <div style={styles.emptyState}>Среды не найдены</div>
        ) : null}

        {!loading
          && environments.map((environment) => {
            const isSelected =
              Number(selectedEnvironmentId) === Number(environment.id);

            return (
              <button
                key={environment.id}
                type="button"
                onClick={() => onSelect(environment)}
                style={{
                  ...styles.listRow,
                  ...(isSelected ? styles.listRowSelected : {}),
                }}
                aria-pressed={isSelected}
              >
                <div style={styles.idCell}>{environment.id}</div>
                <div>
                  <div style={styles.envName}>
                    {environment.environment_key}
                  </div>
                  <div style={styles.envKey}>{environment.name}</div>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
