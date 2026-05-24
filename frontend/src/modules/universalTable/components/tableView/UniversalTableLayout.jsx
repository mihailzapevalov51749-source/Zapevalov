import UniversalTableMainContent from "../core/UniversalTableMainContent";
import UniversalTableTopBar from "../core/UniversalTableTopBar";
import TableViewBar from "../views/TableViewBar";

export default function UniversalTableLayout({
  topBarProps = {},
  mainContentProps = {},
  tableViewBarProps = {},
}) {
  const enhancedMainContentProps = {
    ...mainContentProps,

    block: mainContentProps?.block || topBarProps?.block || null,

    onBlockUpdated:
      mainContentProps?.onBlockUpdated || topBarProps?.onBlockUpdated || null,
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.tableTopBar}>
        <UniversalTableTopBar {...topBarProps} />
      </div>

      <div style={styles.tableViewBar}>
        <TableViewBar {...tableViewBarProps} />
      </div>

      <div style={styles.content}>
        <UniversalTableMainContent {...enhancedMainContentProps} />
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    height: "100%",
    minHeight: 0,

    display: "flex",
    flexDirection: "column",

    overflow: "hidden",
  },

  tableTopBar: {
    flexShrink: 0,

    position: "relative",
    zIndex: 20,

    overflow: "visible",
  },

  tableViewBar: {
    flexShrink: 0,

    position: "relative",
    zIndex: 30,

    overflow: "visible",
  },

  content: {
    width: "100%",
    flex: 1,
    minHeight: 0,

    display: "flex",
    flexDirection: "column",

    overflow: "hidden",
  },
};