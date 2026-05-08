import { useState } from "react";

import checklistIcon from "../../../../assets/icons/ListChecks.svg";
import subtasksIcon from "../../../../assets/icons/list-bullets.svg";
import notebookIcon from "../../../../assets/icons/NotebookPen.svg";
import resultIcon from "../../../../assets/icons/Flag.svg";

import {
  entityCardTabsWrapperStyle,
  entityCardTabsHeaderStyle,
  entityCardTabButtonStyle,
  entityCardActiveTabButtonStyle,
  entityCardTabIconStyle,
  entityCardTabsContentStyle,
} from "./styles/entityCardTabsStyles";

export default function EntityCardTabs({
  row,
}) {
  const [activeTab, setActiveTab] =
    useState("checklist");

  const tabs = [
    {
      id: "checklist",
      title: "Чек-лист",
      icon: checklistIcon,
    },
    {
      id: "subtasks",
      title: "Подзадачи",
      icon: subtasksIcon,
    },
    {
      id: "notebook",
      title: "Блокнот",
      icon: notebookIcon,
    },
    {
      id: "result",
      title: "Результат",
      icon: resultIcon,
    },
  ];

  return (
    <div style={entityCardTabsWrapperStyle}>
      <div style={entityCardTabsHeaderStyle}>
        {tabs.map((tab) => {
          const isActive =
            activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(tab.id)
              }
              style={{
                ...entityCardTabButtonStyle,
                ...(isActive
                  ? entityCardActiveTabButtonStyle
                  : {}),
              }}
            >
              <img
                src={tab.icon}
                alt=""
                style={entityCardTabIconStyle}
              />

              {tab.title}
            </button>
          );
        })}
      </div>

      <div style={entityCardTabsContentStyle}>
        {activeTab === "checklist" && (
          <div>
            Чек-лист задачи
          </div>
        )}

        {activeTab === "subtasks" && (
          <div>
            Подзадачи
          </div>
        )}

        {activeTab === "notebook" && (
          <div>
            Блокнот
          </div>
        )}

        {activeTab === "result" && (
          <div>
            Результат выполнения
          </div>
        )}
      </div>
    </div>
  );
}