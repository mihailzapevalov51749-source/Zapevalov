import { readFileSync } from "node:fs";

import { dirname, resolve } from "node:path";

import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";



const here = dirname(fileURLToPath(import.meta.url));



describe("object entity delete modals", () => {

  it("use shared PlatformModal delete layout", () => {

    const keysSource = readFileSync(

      resolve(here, "objectEntityDeleteModalKeys.js"),

      "utf8",

    );

    const baseSource = readFileSync(

      resolve(here, "ObjectEntityDeleteModalBase.jsx"),

      "utf8",

    );

    const confirmSource = readFileSync(

      resolve(here, "ObjectEntityDeleteConfirmModal.jsx"),

      "utf8",

    );

    const scenarioSource = readFileSync(

      resolve(here, "ObjectEntityDeleteScenarioModal.jsx"),

      "utf8",

    );

    const cssSource = readFileSync(resolve(here, "objectEntityDeleteModal.css"), "utf8");



    expect(keysSource).toContain("object-entity-delete-confirm-modal");

    expect(keysSource).toContain("object-entity-delete-scenario-modal");

    expect(baseSource).toContain("ObjectEntityDeleteModalBase");

    expect(baseSource).toContain("canCustomizeLayout");

    expect(baseSource).toContain("Удаление записи");

    expect(confirmSource).toContain("ObjectEntityDeleteModalBase");

    expect(confirmSource).toContain("ObjectEntityDeleteRecordInfo");

    expect(confirmSource).toContain("Вы собираетесь удалить запись.");

    expect(scenarioSource).toContain("ObjectEntityDeleteModalBase");

    expect(scenarioSource).toContain("OBJECT_ENTITY_DELETE_SCENARIO_MODAL_KEY");

    expect(baseSource).toContain("disabled={deleting || deleteDisabled}");
    expect(scenarioSource).toContain("deleteDisabled={!selectedScenario}");

    expect(scenarioSource).toContain("hierarchyLabels");
    expect(scenarioSource).toContain("buildObjectEntityDeleteScenarioOptions");
    expect(scenarioSource).not.toContain("Подзадача");

    expect(scenarioSource).toContain("ot-entity-delete-modal__warning");

    expect(scenarioSource).toContain("ot-entity-delete-modal__radio");

    expect(cssSource).toContain("width: 480px");

    expect(cssSource).toContain("min-width: 420px");

    expect(cssSource).toContain("max-width: 620px");

    expect(cssSource).toContain("border-top: none !important");

  });

});


