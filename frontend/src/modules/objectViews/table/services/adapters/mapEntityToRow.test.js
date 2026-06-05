import { describe, expect, it } from "vitest";



import { TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY } from "../../../../../shared/runtime/systemEntityFields";
import { SYSTEM_COLUMN_KEYS } from "../../../../../shared/viewEngine/systemColumnKeys";

import { mapEntityToRow } from "./mapEntityToRow";



describe("mapEntityToRow", () => {

  it("resolves presentation № column value from record_number", () => {
    const entity = {
      id: "entity-1",
      record_number: 7,
    };

    const columns = [
      {
        key: TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY,
        label: "№",
        fieldDef: {
          key: TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY,
          label: "№",
          type: "number",
          isSystem: true,
        },
      },
    ];

    const row = mapEntityToRow(entity, columns);

    expect(row.recordNumber).toBe(7);
    expect(
      row.cells.find(
        (cell) => cell.fieldKey === TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY,
      )?.value,
    ).toBe(7);
  });

  it("exposes record_number on row for dedicated № column, not as data cell", () => {

    const entity = {

      id: "entity-1",

      record_number: 3,

      values: {

        [SYSTEM_COLUMN_KEYS.recordNumber]: 3,

        title: "Первая задача",

      },

    };



    const columns = [

      {

        key: "title",

        label: "Название",

        fieldDef: { key: "title", label: "Название", type: "text" },

      },

    ];



    const row = mapEntityToRow(entity, columns);



    expect(row.recordNumber).toBe(3);

    expect(

      row.cells.find((cell) => cell.fieldKey === SYSTEM_COLUMN_KEYS.recordNumber),

    ).toBeUndefined();

    expect(row.cells.find((cell) => cell.fieldKey === "title")?.value).toBe(

      "Первая задача",

    );

  });

});


