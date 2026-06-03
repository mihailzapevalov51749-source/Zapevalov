import { useCallback, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../api/platformApiClient";
import * as designerApi from "../api/designerApi";
import CreateObjectTypeModal from "../components/objectTypes/CreateObjectTypeModal";
import ObjectTypesList from "../components/objectTypes/ObjectTypesList";
import { useDesignerShell } from "../context/DesignerShellContext";

export default function ObjectTypesPage() {
  const { tenantId } = useDesignerShell();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitError, setCreateSubmitError] = useState("");

  const existingObjectTypeKeys = useMemo(
    () => items.map((item) => item.key).filter(Boolean),
    [items],
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await designerApi.listObjectTypes(tenantId);
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить Object Types"));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleOpenCreateModal = () => {
    setCreateSubmitError("");
    setCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
    setCreateSubmitError("");
  };

  const handleCreateObjectType = async (payload) => {
    setCreating(true);
    setCreateSubmitError("");

    try {
      await designerApi.createObjectType(tenantId, {
        ...payload,
        status: "active",
      });
      await loadItems();
      setCreateModalOpen(false);
    } catch (err) {
      setCreateSubmitError(getApiErrorMessage(err, "Не удалось создать Object Type"));
      throw err;
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <ObjectTypesList
        items={items}
        loading={loading}
        error={error}
        onCreate={handleOpenCreateModal}
        creating={creating}
      />
      <CreateObjectTypeModal
        isOpen={createModalOpen}
        existingKeys={existingObjectTypeKeys}
        isSubmitting={creating}
        submitError={createSubmitError}
        onClose={handleCloseCreateModal}
        onCreate={handleCreateObjectType}
      />
    </>
  );
}
