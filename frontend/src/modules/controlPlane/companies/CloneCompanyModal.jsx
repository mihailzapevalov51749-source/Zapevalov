import { useEffect, useMemo, useState } from "react";

import { clonePortalStructure } from "../../admin/tenants/portalsApi";
import PlatformModal from "../../../shared/platformModal/PlatformModal";
import "../../../shared/platformModal/platformModalFooter.css";
import "../../../shared/quickCreate/platformQuickCreateModal.css";

import {
  CONTROL_PLANE_CLONE_COMPANY_MODAL_DEFAULT_BOUNDS,
  CONTROL_PLANE_CLONE_COMPANY_MODAL_KEY,
  CONTROL_PLANE_MODAL_CONTENT_STYLE,
  CONTROL_PLANE_MODAL_VIEWPORT_INSET,
} from "./controlPlaneModalKeys.js";

const CLONE_COMPANY_FORM_ID = "control-plane-clone-company-form";

export default function CloneCompanyModal({
  isOpen,
  company,
  sourceOptions,
  onClose,
  onCloned,
}) {
  const [sourceTenantId, setSourceTenantId] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const templateOption = useMemo(
    () =>
      sourceOptions.find((item) => String(item.tenant_type || "").toUpperCase() === "TEMPLATE")
      ?? sourceOptions.find((item) => Number(item.id) === 2)
      ?? null,
    [sourceOptions],
  );

  useEffect(() => {
    if (!isOpen) {
      setSourceTenantId("");
      setError("");
      setIsSaving(false);
      return;
    }

    if (templateOption) {
      setSourceTenantId(String(templateOption.id));
    }
  }, [isOpen, templateOption]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!company) {
      return;
    }

    const parsedSourceId = Number(sourceTenantId);

    if (!Number.isFinite(parsedSourceId) || parsedSourceId <= 0) {
      setError("Выберите источник структуры");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      await clonePortalStructure(company.id, {
        source_tenant_id: parsedSourceId,
      });
      onCloned?.();
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail ||
        requestError?.message ||
        "Не удалось клонировать структуру";
      setError(typeof detail === "string" ? detail : "Не удалось клонировать структуру");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PlatformModal
      modalKey={CONTROL_PLANE_CLONE_COMPANY_MODAL_KEY}
      open={Boolean(isOpen && company)}
      onClose={onClose}
      title="Клонировать структуру"
      subtitle={
        company ? `Целевая компания: ${company.name}` : "Компании · Клиенты"
      }
      canCustomizeLayout
      keepFullyVisible
      viewportInset={CONTROL_PLANE_MODAL_VIEWPORT_INSET}
      defaultBounds={CONTROL_PLANE_CLONE_COMPANY_MODAL_DEFAULT_BOUNDS}
      ariaLabel="Клонирование структуры компании"
      contentStyle={CONTROL_PLANE_MODAL_CONTENT_STYLE}
      footer={
        <div className="platform-modal-footer" data-platform-modal-no-drag>
          <div className="platform-modal-footer__leading" />
          <div className="platform-modal-footer__actions">
            <button
              type="button"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Отмена
            </button>
            <button
              type="submit"
              form={CLONE_COMPANY_FORM_ID}
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--primary"
              disabled={isSaving || !company}
            >
              {isSaving ? "Клонирование..." : "Клонировать"}
            </button>
          </div>
        </div>
      }
    >
      <div className="platform-quick-create-modal__body">
        <form
          id={CLONE_COMPANY_FORM_ID}
          className="platform-quick-create-modal__form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="platform-quick-create-modal__fields">
            <div className="platform-quick-create-modal__field">
              <label
                className="platform-quick-create-modal__label"
                htmlFor="clone-source-tenant"
              >
                Источник структуры
                <span className="platform-quick-create-modal__required" aria-hidden>
                  *
                </span>
              </label>
              <div className="platform-quick-create-modal__control">
                <select
                  id="clone-source-tenant"
                  className="field-editor-input"
                  value={sourceTenantId}
                  onChange={(event) => setSourceTenantId(event.target.value)}
                >
                  <option value="">Выберите tenant</option>
                  {(sourceOptions || [])
                    .filter((item) => Number(item.id) !== Number(company?.id))
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (#{item.id})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {error ? (
            <p className="platform-quick-create-modal__error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </PlatformModal>
  );
}
