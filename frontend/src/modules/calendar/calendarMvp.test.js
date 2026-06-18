import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const calendarDir = dirname(fileURLToPath(import.meta.url));
const portalDir = join(calendarDir, "../../portal");

function readSource(relativePath) {
  return readFileSync(join(calendarDir, relativePath), "utf8");
}

describe("Corporate calendar MVP", () => {
  it("runtime.calendar renders CorporateCalendarPage", () => {
    const portalSource = readFileSync(join(portalDir, "PortalPageView.jsx"), "utf8");
    const resolverSource = readFileSync(join(portalDir, "resolveCorporateCalendarPage.js"), "utf8");

    assert.match(resolverSource, /runtime\.calendar/);
    assert.match(portalSource, /CorporateCalendarPage/);
    assert.match(portalSource, /resolveIsCorporateCalendarPage/);
  });

  it("CreateEventModal uses Platform Modal", () => {
    const source = readSource("components/CalendarEventModal.jsx");
    assert.match(source, /PlatformModal/);
    assert.match(source, /Создание события/);
  });

  it("tenant user picker is used", () => {
    const modalSource = readSource("components/CalendarEventModal.jsx");
    const apiSource = readSource("api/calendarApi.js");

    assert.match(modalSource, /searchUsers/);
    assert.match(apiSource, /searchUsers/);
    assert.match(apiSource, /chatsApi/);
  });

  it("calendar renders outlook-like views", () => {
    const pageSource = readSource("pages/CorporateCalendarPage.jsx");

    assert.match(pageSource, /CalendarWeekView/);
    assert.match(pageSource, /CalendarDayView/);
    assert.match(pageSource, /CalendarMonthView/);
    assert.match(pageSource, /CalendarSidebar/);
    assert.match(pageSource, /createCalendarEvent/);
  });

  it("event details opens", () => {
    const pageSource = readSource("pages/CorporateCalendarPage.jsx");
    const detailsSource = readSource("components/CalendarEventDetailsPanel.jsx");

    assert.match(pageSource, /CalendarEventDetailsPanel/);
    assert.match(pageSource, /setSelectedEvent/);
    assert.match(detailsSource, /Открыть чат/);
  });

  it("registers page layout contract like corporate chat", () => {
    const pageSource = readSource("pages/CorporateCalendarPage.jsx");
    const chatSource = readFileSync(
      join(calendarDir, "../chats/pages/CorporateChatPage.jsx"),
      "utf8",
    );

    assert.match(pageSource, /useResolvedPageLayoutContract/);
    assert.match(pageSource, /PAGE_LAYOUT_PAGE_TYPE\.CALENDAR/);
    assert.match(chatSource, /PAGE_LAYOUT_PAGE_TYPE\.CHAT_ROOM/);
  });

  it("CalendarToolbar renders outlook controls", () => {
    const pageSource = readSource("pages/CorporateCalendarPage.jsx");
    const toolbarSource = readSource("components/CalendarToolbar.jsx");

    assert.match(toolbarSource, /\+ Создать событие/);
    assert.match(toolbarSource, /Сегодня/);
    assert.match(toolbarSource, /onNavigatePrevious/);
    assert.match(toolbarSource, /onNavigateNext/);
    assert.match(toolbarSource, /День/);
    assert.match(toolbarSource, /Неделя/);
    assert.match(toolbarSource, /Месяц/);
    assert.match(pageSource, /onCreateEvent=\{\(\) => openCreateModal\(\)\}/);
  });

  it("CalendarEventModal passes open prop to PlatformModal", () => {
    const modalSource = readSource("components/CalendarEventModal.jsx");

    assert.match(modalSource, /PlatformModal/);
    assert.match(modalSource, /open=\{isOpen\}/);
    assert.doesNotMatch(modalSource, /isOpen=\{isOpen\}/);
  });

  it("CorporateCalendarPage avoids selectedEvent reload loop after create", () => {
    const pageSource = readSource("pages/CorporateCalendarPage.jsx");

    assert.match(pageSource, /setSelectedEvent\(\(current\)/);
    assert.doesNotMatch(
      pageSource,
      /\[tenantId, focusDate, eventType, search, selectedEvent\]/,
    );
    assert.match(pageSource, /loadEvents\(\{ background: true \}\)/);
    assert.match(pageSource, /showInitialLoader = isLoading && events\.length === 0/);
    assert.match(pageSource, /getLoadRange\(focusDate, viewMode\)/);
  });

  it("CalendarMonthView uses stable event and cell keys", () => {
    const monthSource = readSource("components/CalendarMonthView.jsx");

    assert.match(monthSource, /key=\{event\.id\}/);
    assert.match(monthSource, /const cellKey = `\$\{cellDate\.getFullYear\(\)\}-\$\{cellDate\.getMonth\(\)\}-\$\{cellDate\.getDate\(\)\}`/);
    assert.doesNotMatch(monthSource, /key=\{cellDate\.toISOString\(\)\}/);
  });

  it("CalendarWeekView uses sticky day header inside scroll container", () => {
    const weekSource = readSource("components/CalendarWeekView.jsx");
    const stylesSource = readSource("styles/calendarStyles.js");

    assert.match(weekSource, /timeGridScroll/);
    assert.match(weekSource, /timeGridHeader/);
    assert.match(stylesSource, /timeGridScroll:/);
    assert.match(stylesSource, /position: "sticky"/);
    assert.match(stylesSource, /mainPanelTimeGrid:/);
  });

  it("CalendarWeekView handles slot contextmenu on events layer", () => {
    const weekSource = readSource("components/CalendarWeekView.jsx");

    assert.match(weekSource, /timeGridEventsLayer/);
    assert.match(weekSource, /onContextMenu=\{\(event\) =>/);
    assert.match(weekSource, /buildGridSlotContextPayload/);
    assert.match(weekSource, /event\.preventDefault\(\)/);
    assert.match(weekSource, /event\.stopPropagation\(\)/);
  });

  it("CalendarDayView uses sticky day header inside scroll container", () => {
    const daySource = readSource("components/CalendarDayView.jsx");

    assert.match(daySource, /timeGridScroll/);
    assert.match(daySource, /timeGridHeaderDay/);
  });

  it("CorporateCalendarPage uses time grid main panel for week and day", () => {
    const pageSource = readSource("pages/CorporateCalendarPage.jsx");

    assert.match(pageSource, /mainPanelTimeGrid/);
    assert.match(pageSource, /viewMode === "month"/);
  });

  it("CalendarSidebar includes mini calendar and calendar lists", () => {
    const sidebarSource = readSource("components/CalendarSidebar.jsx");

    assert.match(sidebarSource, /CalendarMiniMonth/);
    assert.match(sidebarSource, /Мои календари/);
    assert.match(sidebarSource, /Календари компании/);
  });

  it("CorporateCalendarPage deduplicates events by id", () => {
    const pageSource = readSource("pages/CorporateCalendarPage.jsx");

    assert.match(pageSource, /function dedupeEventsById/);
    assert.match(pageSource, /dedupeEventsById\(\[created, \.\.\.current\]\)/);
  });

  it("calendar date utils support view switcher ranges", () => {
    const utilsSource = readSource("utils/calendarDateUtils.js");

    assert.match(utilsSource, /getLoadRange/);
    assert.match(utilsSource, /shiftFocusDate/);
    assert.match(utilsSource, /formatPeriodTitle/);
  });

  it("CalendarContextMenu imports match calendarContextMenu exports", () => {
    const menuComponentSource = readSource("components/CalendarContextMenu.jsx");
    const utilsSource = readSource("utils/calendarContextMenu.js");

    assert.match(menuComponentSource, /SLOT_CONTEXT_MENU_ACTIONS/);
    assert.match(menuComponentSource, /EVENT_CONTEXT_MENU_ACTIONS/);
    assert.match(utilsSource, /export const SLOT_CONTEXT_MENU_ACTIONS/);
    assert.match(utilsSource, /export const EVENT_CONTEXT_MENU_ACTIONS/);
    assert.match(menuComponentSource, /state\?\.mode === "event"/);
    assert.match(menuComponentSource, /SLOT_CONTEXT_MENU_ACTIONS/);
  });

  it("calendar context menu is wired into page and views", () => {
    const pageSource = readSource("pages/CorporateCalendarPage.jsx");
    const weekSource = readSource("components/CalendarWeekView.jsx");
    const monthSource = readSource("components/CalendarMonthView.jsx");
    const cardSource = readSource("components/CalendarEventCard.jsx");
    const menuSource = readSource("components/CalendarContextMenu.jsx");

    assert.match(pageSource, /CalendarContextMenu/);
    assert.match(pageSource, /PlatformConfirmModal/);
    assert.match(pageSource, /onSlotContextMenu/);
    assert.match(pageSource, /onEventContextMenu/);
    assert.match(pageSource, /deleteCalendarEvent/);
    assert.match(pageSource, /updateCalendarEvent/);
    assert.match(weekSource, /onContextMenu/);
    assert.match(monthSource, /onContextMenu/);
    assert.match(cardSource, /onContextMenu/);
    assert.match(menuSource, /Escape/);
  });

  it("CalendarEventModal supports create and edit prefill", () => {
    const modalSource = readSource("components/CalendarEventModal.jsx");

    assert.match(modalSource, /prefill/);
    assert.match(modalSource, /mode = "create"/);
    assert.match(modalSource, /onUpdate/);
    assert.match(modalSource, /buildFormValuesFromPrefill/);
  });
});
