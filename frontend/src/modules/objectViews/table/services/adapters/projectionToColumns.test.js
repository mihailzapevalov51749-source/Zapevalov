import { describe, expect, it } from "vitest";



import { SYSTEM_ENTITY_FIELD_KEYS } from "../../../../../shared/runtime/systemEntityFields";

import { projectionToColumns } from "./projectionToColumns";



describe("projectionToColumns", () => {

  it("does not build a duplicate record_number data column", () => {

    const columns = projectionToColumns({

      projection: {

        field_order: ["title", SYSTEM_ENTITY_FIELD_KEYS.recordNumber],

        visible_fields: ["title", SYSTEM_ENTITY_FIELD_KEYS.recordNumber],

        title_field: "title",

      },

      fields: [

        { key: "title", name: "Название", field_type: "text" },

        {

          key: SYSTEM_ENTITY_FIELD_KEYS.recordNumber,

          name: "№ записи",

          field_type: "number",

          is_system: true,

        },

      ],

      options: {

        titleFieldKey: "title",

        isAllMode: true,

      },

    });



    expect(columns.map((column) => column.key)).toEqual(["title"]);

  });

  it("builds presentation № column from __table_row_number key", () => {
    const columns = projectionToColumns({
      projection: {
        field_order: ["__table_row_number", "title"],
        visible_fields: ["__table_row_number", "title"],
        title_field: "title",
      },
      fields: [{ key: "title", name: "Название", field_type: "text" }],
      options: {
        titleFieldKey: "title",
        isAllMode: false,
      },
    });

    expect(columns.map((column) => column.key)).toEqual([
      "__table_row_number",
      "title",
    ]);
    expect(columns[0].label).toBe("№");
  });

});


