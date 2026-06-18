import { useState } from "react";

import PlatformModal from "../../../shared/platformModal/PlatformModal";
import * as platformReleasesApi from "../api/platformReleasesApi";
import TenantPlatformUpdateContent from "./TenantPlatformUpdateContent";

import "../styles/platformReleasesPage.css";

const MODAL_KEY = "tenant_platform_update_modal";

export default function TenantPlatformUpdateModal({
  open = false,
  onClose,
  tenantId,
  offer,
  onApplied,
  onSkipped,
}) {
  const [error, setError] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    if (!tenantId || !offer) {
      return;
    }

    setIsApplying(true);
    setError("");

    try {
      await platformReleasesApi.applyTenantUpdate(tenantId, offer.id);
      await onApplied?.();
      onClose?.();
    } catch (applyError) {
      setError(
        platformReleasesApi.getApiErrorMessage(applyError, "Не удалось применить обновление"),
      );
    } finally {
      setIsApplying(false);
    }
  };

  const handleSkip = async () => {
    if (!tenantId || !offer) {
      return;
    }

    setError("");

    try {
      await platformReleasesApi.skipTenantUpdate(tenantId, offer.id);
      await onSkipped?.();
      onClose?.();
    } catch (skipError) {
      setError(
        platformReleasesApi.getApiErrorMessage(skipError, "Не удалось отложить обновление"),
      );
    }
  };

  return (
    <PlatformModal
      modalKey={MODAL_KEY}
      open={open}
      onClose={onClose}
      title="Доступно обновление платформы"
      canCustomizeLayout
      footer={(
        <div className="platform-update-panel__actions">
          <button type="button" onClick={handleApply} disabled={isApplying || !offer}>
            {isApplying ? "Применение…" : "Применить"}
          </button>
          <button type="button" onClick={handleSkip} disabled={isApplying || !offer}>
            Отложить
          </button>
        </div>
      )}
    >
      <TenantPlatformUpdateContent offer={offer} error={error} />
    </PlatformModal>
  );
}
