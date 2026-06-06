/**
 * Display-only mirror of backend STAGE_WORK_WEIGHTS (stage_works.py).
 * Used for task ordering and point totals in owner detail panel — does not affect readiness %.
 */

const STAGE_TASK_WEIGHTS = {
  "Завершить перевод legacy страниц на объектную платформу": 20,
  "Подготовить стратегию миграции данных Universal Tables": 20,
  "Реализовать чек-листы в карточке": 10,
  "Реализовать многоколоночную сортировку": 10,
  "Реализовать фильтрацию по связям": 10,
  "Реализовать перетаскивание строк": 10,
  "Реализовать режим дерева": 10,
  "Реализовать поиск по таблице": 5,
  "Реализовать дублирование записей": 5,
  "Реализовать массовое изменение записей": 5,
  "Сохранять выбранный быстрый фильтр": 5,
  "Вернуть номер строки таблицы": 5,
  "Реализовать редактирование связей в таблице": 5,
  "Реализовать экспорт Excel": 4,
  "Реализовать импорт Excel": 4,
  "Реализовать закрепление колонок": 4,
  "Реализовать виртуализацию строк": 4,
  "Реализовать тип поля Ссылка": 4,
};

const DEFAULT_TASK_WEIGHT = 1;

export function resolveTaskDisplayWeight(taskTitle) {
  const normalized = String(taskTitle ?? "").trim();
  if (!normalized) {
    return DEFAULT_TASK_WEIGHT;
  }
  return STAGE_TASK_WEIGHTS[normalized] ?? DEFAULT_TASK_WEIGHT;
}

export function hasKnownTaskWeights(taskTitles = []) {
  return taskTitles.some((title) => STAGE_TASK_WEIGHTS[String(title ?? "").trim()] != null);
}

export function sortTasksByWeightDesc(titles = []) {
  return [...titles].sort((left, right) => {
    const weightDiff =
      resolveTaskDisplayWeight(right) - resolveTaskDisplayWeight(left);
    if (weightDiff !== 0) {
      return weightDiff;
    }
    return String(left).localeCompare(String(right), "ru");
  });
}

export function sumTaskWeights(titles = []) {
  return titles.reduce(
    (total, title) => total + resolveTaskDisplayWeight(title),
    0,
  );
}
