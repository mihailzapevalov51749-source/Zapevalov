import { describe, expect, it } from "vitest";



import {

  buildRoleMappingPayload,

  normalizeRoleLabels,

  normalizeRoleMapping,

  sanitizeRoleMapping,

} from "./objectViewRoleMapping.js";



describe("objectViewRoleMapping", () => {

  it("ignores labels key in field mapping normalization", () => {

    const mapping = normalizeRoleMapping({

      nodeTitle: "title",

      labels: { nodeTitle: "Компонент" },

    });



    expect(mapping).toEqual({ nodeTitle: "title" });

  });



  it("extracts role labels", () => {

    const labels = normalizeRoleLabels({

      labels: {

        nodeTitle: "Компонент",

        nodeStatus: "Состояние",

        invalid: "skip",

      },

    });



    expect(labels).toEqual({

      nodeTitle: "Компонент",

      nodeStatus: "Состояние",

    });

  });



  it("preserves labels during sanitize", () => {

    const sanitized = sanitizeRoleMapping(

      {

        nodeTitle: "title",

        nodeStatus: "missing",

        labels: { nodeStatus: "Состояние" },

      },

      ["title"],

    );



    expect(sanitized).toEqual({

      nodeTitle: "title",

      labels: { nodeStatus: "Состояние" },

    });

  });



  it("builds payload with labels", () => {

    const payload = buildRoleMappingPayload(

      { nodeTitle: "title" },

      { nodeTitle: "Компонент" },

    );



    expect(payload).toEqual({

      nodeTitle: "title",

      labels: { nodeTitle: "Компонент" },

    });

  });

});


