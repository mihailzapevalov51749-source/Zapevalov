import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../api/platformApiClient";
import * as designerApi from "../api/designerApi";
import ObjectTypesList from "../components/objectTypes/ObjectTypesList";
import { useDesignerShell } from "../context/DesignerShellContext";

export default function ObjectTypesPage() {
  const { tenantId } = useDesignerShell();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

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

  const handleCreate = async () => {
    const name = window.prompt("Название Object Type", "Новый объект");
    if (!name) {
      return;
    }

    const key = window
      .prompt("Key (например project_test)", "new_object")
      ?.trim()
      .toLowerCase();

    if (!key) {
      return;
    }

    setCreating(true);

    try {
      await designerApi.createObjectType(tenantId, {
        name,
        key,
        description: "",
        status: "active",
      });
      await loadItems();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось создать Object Type"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <ObjectTypesList
      items={items}
      loading={loading}
      error={error}
      onCreate={handleCreate}
      creating={creating}
    />
  );
}
