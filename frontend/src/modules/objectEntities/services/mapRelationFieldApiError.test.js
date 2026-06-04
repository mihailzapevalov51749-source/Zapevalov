import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapRelationFieldApiError } from "./mapRelationFieldApiError.js";

describe("mapRelationFieldApiError", () => {
  it("maps 404", () => {
    assert.equal(
      mapRelationFieldApiError({ response: { status: 404, data: {} } }),
      "Связь или запись не найдены",
    );
  });

  it("maps 409", () => {
    assert.equal(
      mapRelationFieldApiError({ response: { status: 409, data: {} } }),
      "Такая связь уже существует",
    );
  });

  it("maps 422", () => {
    assert.equal(
      mapRelationFieldApiError({ response: { status: 422, data: {} } }),
      "Некорректные данные для связи",
    );
  });

  it("uses string detail from API", () => {
    assert.equal(
      mapRelationFieldApiError({
        response: { status: 400, data: { detail: "role=target не соответствует" } },
      }),
      "role=target не соответствует",
    );
  });
});
