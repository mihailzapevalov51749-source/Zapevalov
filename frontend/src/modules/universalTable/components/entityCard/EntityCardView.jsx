import EntityCardLayout from "./EntityCardLayout";

import EntityCardHeader from "./EntityCardHeader";
import EntityCardParent from "./EntityCardParent";
import EntityCardMain from "./EntityCardMain";
import EntityCardDynamicFields from "./EntityCardDynamicFields";
import EntityCardTabs from "./EntityCardTabs";
import EntityCardAttachments from "./EntityCardAttachments";
import EntityCardComments from "./EntityCardComments";

export default function EntityCardView({
  row,
  table,
  columns = [],
  onClose,
}) {
  return (
    <EntityCardLayout
      header={
        <EntityCardHeader
          row={row}
          table={table}
          onClose={onClose}
        />
      }
      content={
        <>
          <EntityCardParent row={row} />

          <EntityCardMain row={row} columns={columns} />

          <EntityCardDynamicFields row={row} columns={columns} />

          <EntityCardTabs row={row} />

          <EntityCardAttachments row={row} columns={columns} />
        </>
      }
      sidebar={<EntityCardComments row={row} />}
    />
  );
}