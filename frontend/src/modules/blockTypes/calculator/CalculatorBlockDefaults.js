/**
 * CalculatorBlockDefaults
 *
 * Назначение:
 * Значения по умолчанию при создании блока.
 *
 * Используется когда пользователь добавляет новый блок.
 */

export const calculatorBlockDefaults = {
  type: "calculator",

  title: "Калькулятор",

  content: {
    fields: [],
    formulas: [],
    results: [],
  },

  settings: {
    show_title: true,
  },
};