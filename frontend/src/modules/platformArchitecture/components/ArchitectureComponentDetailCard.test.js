import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const REMOVED_LABELS = [
  "Тип",
  "Категория",
  "Архитектурная зона",
  "Статус",
  "Используется в",
  "Связанные элементы",
  "Архитектурные решения",
  "Правила и запреты",
  "Фактически найдено",
  "Источники",
  "API",
  "База данных",
  "Таблицы",
  "Миграции",
  "Тесты",
  "Связанные ADR",
  "История изменений",
  "Общая информация",
];

const REQUIRED_LABELS = [
  "Техническое название",
  "Описание",
  "Назначение",
  "Backend файлы",
  "Frontend файлы",
  "Последняя проверка",
];

test("architecture component card shows simplified blocks only", () => {
  const source = readFileSync(join(__dirname, "ArchitectureComponentDetailCard.jsx"), "utf8");

  for (const label of REQUIRED_LABELS) {
    assert.match(source, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const label of REMOVED_LABELS) {
    assert.doesNotMatch(source, new RegExp(`<dt>${label}</dt>`));
    assert.doesNotMatch(source, new RegExp(`>${label}</h3>`));
  }
});
