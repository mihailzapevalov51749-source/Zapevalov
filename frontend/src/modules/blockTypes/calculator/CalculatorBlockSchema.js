/**
 * CalculatorBlockSchema
 *
 * Назначение:
 * Описывает структуру данных блока.
 *
 * Используется для:
 * - стандартизации блока
 * - будущей валидации
 * - автогенерации UI (в перспективе)
 */

export const calculatorBlockSchema = {
  type: "calculator",

  content: {
    fields: [],     // список входных параметров
    formulas: [],   // формулы расчёта
    results: [],    // результаты
  },

  settings: {
    show_title: true,
  },
};