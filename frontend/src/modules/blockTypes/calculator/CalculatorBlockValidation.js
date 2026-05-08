/**
 * CalculatorBlockValidation
 *
 * Назначение:
 * Проверка данных блока перед сохранением.
 *
 * Здесь в будущем:
 * - проверка корректности формул
 * - проверка заполненности полей
 * - проверка структуры данных
 */

export function validateCalculatorBlock(block) {
  const errors = [];

  if (!block) {
    errors.push("Блок не передан");
    return errors;
  }

  if (block.type !== "calculator") {
    errors.push("Некорректный тип блока");
  }

  // В будущем:
  // - проверка формул
  // - проверка полей

  return errors;
}