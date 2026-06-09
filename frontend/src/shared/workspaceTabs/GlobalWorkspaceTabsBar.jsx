import { useGlobalWorkspaceTabs } from "./GlobalWorkspaceTabsProvider";
import { resolveWorkspaceTabDisplayTitle } from "./resolveWorkspaceTabDisplayTitle.js";







import "./globalWorkspaceTabsBar.css";







export default function GlobalWorkspaceTabsBar() {



  const { tabs, activeTabId, openTab, closeTab } = useGlobalWorkspaceTabs();







  if (!tabs.length) {



    return null;



  }







  return (



    <div className="global-workspace-tabs-bar" role="tablist" aria-label="Рабочие страницы">



      {tabs.map((tab) => {



        const tabId = String(tab.id);



        const isActive = tabId === String(activeTabId);
        const displayTitle = resolveWorkspaceTabDisplayTitle(tab);







        return (



          <div



            key={tabId}



            role="tab"



            tabIndex={0}



            aria-selected={isActive}



            className={[



              "global-workspace-tabs-bar__tab",



              isActive ? "is-active" : "",



              tab.is_minimized ? "is-minimized" : "",



            ]



              .filter(Boolean)



              .join(" ")}



            onClick={() => openTab(tab)}



            onKeyDown={(event) => {



              if (event.key === "Enter" || event.key === " ") {



                event.preventDefault();



                openTab(tab);



              }



            }}



          >



            <span className="global-workspace-tabs-bar__label" title={displayTitle}>



              {displayTitle}



            </span>



            <button



              type="button"



              className="global-workspace-tabs-bar__close"



              aria-label={`Закрыть вкладку ${displayTitle}`}



              onClick={(event) => {



                event.stopPropagation();



                closeTab(tabId);



              }}



            >



              ×



            </button>



          </div>



        );



      })}



    </div>



  );



}


