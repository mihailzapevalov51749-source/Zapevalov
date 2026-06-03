import { navigationService } from "../../navigation/services/navigationService";
import { treeHasObjectTypeMenuPlacement } from "./objectTypePublishState";

export async function detectObjectTypeMenuPlacement(tenantId, objectTypeId) {
  if (!tenantId || !objectTypeId) {
    return false;
  }

  try {
    const [designerTree, runtimeTree] = await Promise.all([
      navigationService.getTree(tenantId, { scope: "designer", mode: "designer" }),
      navigationService.getTree(tenantId, { scope: "runtime", mode: "runtime" }),
    ]);

    return (
      treeHasObjectTypeMenuPlacement(designerTree, objectTypeId) ||
      treeHasObjectTypeMenuPlacement(runtimeTree, objectTypeId)
    );
  } catch {
    return false;
  }
}
