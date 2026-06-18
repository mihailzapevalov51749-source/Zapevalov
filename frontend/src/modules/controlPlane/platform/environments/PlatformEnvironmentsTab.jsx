import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getPlatformEnvironment,
  listPlatformEnvironments,
} from "../../api/platformEnvironmentsApi";
import { buildControlPlanePlatformPath } from "../../config/controlPlanePaths";
import EnvironmentDetailCard from "./EnvironmentDetailCard";
import EnvironmentsList from "./EnvironmentsList";
import { platformEnvironmentsStyles as styles } from "./platformEnvironmentsStyles.js";
import { openTemplateFromEnvironment } from "../../../../portal/utils/openTemplateFromEnvironment.js";

export default function PlatformEnvironmentsTab() {
  const navigate = useNavigate();
  const { portalId: portalIdParam } = useParams();
  const selectedEnvironmentId = portalIdParam ? Number(portalIdParam) : null;

  const [environments, setEnvironments] = useState([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [isOpeningTemplate, setIsOpeningTemplate] = useState(false);

  const loadEnvironments = useCallback(async () => {
    try {
      setIsListLoading(true);
      setListError("");
      const data = await listPlatformEnvironments();
      const items = Array.isArray(data) ? data : [];
      setEnvironments(
        [...items].sort((left, right) => Number(left.id) - Number(right.id)),
      );
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail
        || requestError?.message
        || "Не удалось загрузить список сред";
      setListError(typeof detail === "string" ? detail : "Не удалось загрузить список сред");
      setEnvironments([]);
    } finally {
      setIsListLoading(false);
    }
  }, []);

  const loadSelectedEnvironment = useCallback(async (environmentId) => {
    if (!environmentId) {
      setSelectedEnvironment(null);
      setDetailError("");
      return;
    }

    try {
      setIsDetailLoading(true);
      setDetailError("");
      const data = await getPlatformEnvironment(environmentId);
      setSelectedEnvironment(data);
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail
        || requestError?.message
        || "Не удалось загрузить карточку среды";
      setDetailError(typeof detail === "string" ? detail : "Не удалось загрузить карточку среды");
      setSelectedEnvironment(null);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEnvironments();
  }, [loadEnvironments]);

  useEffect(() => {
    loadSelectedEnvironment(selectedEnvironmentId);
  }, [loadSelectedEnvironment, selectedEnvironmentId]);

  const handleSelectEnvironment = (environment) => {
    if (!environment?.id) {
      return;
    }
    navigate(buildControlPlanePlatformPath(`environments/${environment.id}`));
  };

  const handleOpenTemplate = async () => {
    if (!selectedEnvironment || isOpeningTemplate) {
      return;
    }

    try {
      setIsOpeningTemplate(true);
      await openTemplateFromEnvironment(selectedEnvironment);
    } finally {
      setIsOpeningTemplate(false);
    }
  };

  return (
    <div style={styles.tabContent}>
      {listError ? <div style={styles.error}>{listError}</div> : null}

      <section style={styles.workspace}>
        <EnvironmentsList
          environments={environments}
          loading={isListLoading}
          selectedEnvironmentId={selectedEnvironmentId}
          onSelect={handleSelectEnvironment}
        />

        <EnvironmentDetailCard
          environment={selectedEnvironment}
          loading={isDetailLoading}
          error={detailError}
          onOpenTemplate={handleOpenTemplate}
          isOpeningTemplate={isOpeningTemplate}
        />
      </section>
    </div>
  );
}
