import { describe, expect, it } from "vitest";



import {

  getInfoEmbeddedPlanTabs,

  getVisiblePlanInfoFields,

  getVisiblePlanInfoSections,

  getVisiblePlanTabs,

  normalizePlanLayoutSettings,

  reorderPlanLayoutItems,

  resolveFirstVisiblePlanTabKey,

  resolvePlanInfoSectionLabel,

  togglePlanLayoutItemShowInInfo,

  togglePlanLayoutItemVisibility,

  updatePlanLayoutTabs,

} from "./planLayoutSettings.js";



describe("planLayoutSettings", () => {

  it("returns defaults when planLayout is missing", () => {

    const layout = normalizePlanLayoutSettings(null);



    expect(layout.tabs).toHaveLength(6);

    expect(layout.infoSections).toHaveLength(6);

    expect(getVisiblePlanTabs(null).map((tab) => tab.id)).toEqual([

      "info",

      "comments",

      "history",

      "files",

      "tasks",

      "checklist",

    ]);

  });



  it("hides tabs and preserves order", () => {

    const layout = updatePlanLayoutTabs(null, [

      { key: "info", label: "Инфо", visible: true, order: 10, system: true },

      { key: "files", label: "Файлы", visible: true, order: 20, system: true },

      { key: "comments", label: "Комментарии", visible: true, order: 30, system: true },

      { key: "history", label: "История", visible: false, order: 40, system: true },

      { key: "tasks", label: "Задачи", visible: true, order: 50, system: true },

      { key: "checklist", label: "Чек-лист", visible: false, order: 60, system: true },

    ]);



    expect(getVisiblePlanTabs(layout).map((tab) => tab.id)).toEqual([

      "info",

      "files",

      "comments",

      "tasks",

    ]);

  });



  it("resolves first visible tab when active tab is hidden", () => {

    const layout = updatePlanLayoutTabs(null, togglePlanLayoutItemVisibility(

      normalizePlanLayoutSettings(null).tabs,

      "info",

    ));



    expect(resolveFirstVisiblePlanTabKey(layout, "info")).toBe("comments");

  });



  it("hides info sections and sorts by order", () => {

    const sections = togglePlanLayoutItemVisibility(

      normalizePlanLayoutSettings(null).infoSections,

      "checklist",

    );



    const layout = normalizePlanLayoutSettings({ infoSections: sections });

    const visibleKeys = getVisiblePlanInfoSections(layout).map((section) => section.key);



    expect(visibleKeys).not.toContain("checklist");

    expect(visibleKeys[0]).toBe("status");

  });



  it("auto-computes main fields from projection minus role mapping", () => {

    const visible = getVisiblePlanInfoFields({

      projectionFieldKeys: [

        "module_name",

        "description",

        "owner",

        "priority",

        "problems",

        "status",

        "deadline",

      ],

      availableFieldKeys: [

        "module_name",

        "description",

        "owner",

        "priority",

        "problems",

        "status",

        "deadline",

      ],

      excludedFieldKeys: ["module_name", "status", "description"],

      visibleInfoSections: [{ key: "problems" }],

      issuesRelationKey: "problems",

    });



    expect(visible).toEqual(["owner", "priority", "deadline"]);

  });



  it("uses role labels for default section titles", () => {

    const label = resolvePlanInfoSectionLabel(

      { key: "status", label: "Статус" },

      { nodeStatus: "Состояние" },

    );



    expect(label).toBe("Состояние");

  });



  it("prefers customized section label over role label", () => {

    const label = resolvePlanInfoSectionLabel(

      { key: "status", label: "Этап" },

      { nodeStatus: "Состояние" },

    );



    expect(label).toBe("Этап");

  });



  it("reorders layout items", () => {

    const tabs = reorderPlanLayoutItems(normalizePlanLayoutSettings(null).tabs, "tasks", "info");



    expect(tabs.map((tab) => tab.key)).toEqual([

      "tasks",

      "info",

      "comments",

      "history",

      "files",

      "checklist",

    ]);

  });



  it("returns tabs embedded in Info via showInInfo", () => {

    const tabs = togglePlanLayoutItemShowInInfo(

      normalizePlanLayoutSettings(null).tabs,

      "checklist",

    );



    const layout = updatePlanLayoutTabs(null, tabs);



    expect(getInfoEmbeddedPlanTabs(layout).map((tab) => tab.id)).toEqual(["checklist"]);

    expect(getVisiblePlanTabs(layout).map((tab) => tab.id)).not.toContain("checklist");

  });



  it("excludes showInInfo tabs from header while keeping them embedded", () => {

    const baseTabs = normalizePlanLayoutSettings(null).tabs;

    const layoutWithEmbeddedChecklist = updatePlanLayoutTabs(

      null,

      togglePlanLayoutItemShowInInfo(baseTabs, "checklist"),

    );



    expect(getVisiblePlanTabs(layoutWithEmbeddedChecklist).map((tab) => tab.id)).toEqual([

      "info",

      "comments",

      "history",

      "files",

      "tasks",

    ]);

    expect(getInfoEmbeddedPlanTabs(layoutWithEmbeddedChecklist).map((tab) => tab.id)).toEqual([

      "checklist",

    ]);



    const layoutStandaloneChecklist = updatePlanLayoutTabs(null, baseTabs);



    expect(getVisiblePlanTabs(layoutStandaloneChecklist).map((tab) => tab.id)).toContain(

      "checklist",

    );

    expect(getInfoEmbeddedPlanTabs(layoutStandaloneChecklist)).toEqual([]);



    const layoutHiddenChecklist = updatePlanLayoutTabs(

      null,

      togglePlanLayoutItemVisibility(baseTabs, "checklist"),

    );



    expect(getVisiblePlanTabs(layoutHiddenChecklist).map((tab) => tab.id)).not.toContain(

      "checklist",

    );

    expect(getInfoEmbeddedPlanTabs(layoutHiddenChecklist)).toEqual([]);



    const layoutEmbeddedOnlyChecklist = updatePlanLayoutTabs(

      null,

      togglePlanLayoutItemShowInInfo(

        togglePlanLayoutItemVisibility(baseTabs, "checklist"),

        "checklist",

      ),

    );



    expect(getVisiblePlanTabs(layoutEmbeddedOnlyChecklist).map((tab) => tab.id)).not.toContain(

      "checklist",

    );

    expect(getInfoEmbeddedPlanTabs(layoutEmbeddedOnlyChecklist).map((tab) => tab.id)).toEqual([

      "checklist",

    ]);

  });



  it("redirects active tab when it moves into Info embed", () => {

    const layout = updatePlanLayoutTabs(

      null,

      togglePlanLayoutItemShowInInfo(normalizePlanLayoutSettings(null).tabs, "checklist"),

    );



    expect(resolveFirstVisiblePlanTabKey(layout, "checklist")).toBe("info");

  });



  it("does not allow info tab in embedded list", () => {

    const tabs = togglePlanLayoutItemShowInInfo(

      normalizePlanLayoutSettings(null).tabs,

      "info",

    );



    const layout = updatePlanLayoutTabs(null, tabs);



    expect(getInfoEmbeddedPlanTabs(layout)).toEqual([]);

  });

});


