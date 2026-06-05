import { describe, expect, it } from "vitest";

import {
  OBJECT_ENTITY_DELETE_SCENARIOS,
  OBJECT_ENTITY_DELETE_SCENARIO_OPTIONS,
} from "./objectEntityDeleteScenarios";

describe("objectEntityDeleteScenarios", () => {
  it("defines both hierarchy delete scenarios", () => {
    expect(OBJECT_ENTITY_DELETE_SCENARIOS.UNLINK_CHILDREN).toBe("unlink_children");
    expect(OBJECT_ENTITY_DELETE_SCENARIOS.WITH_DESCENDANTS).toBe("with_descendants");
    expect(OBJECT_ENTITY_DELETE_SCENARIO_OPTIONS).toHaveLength(2);
    expect(OBJECT_ENTITY_DELETE_SCENARIO_OPTIONS[0].title).toBe(
      "Удалить только запись",
    );
    expect(OBJECT_ENTITY_DELETE_SCENARIO_OPTIONS[1].title).toBe(
      "Удалить запись и все подзадачи",
    );
  });
});
