"use client";

import { useState } from "react";
import { ConditionHelpTooltip } from "@/components/condition-help-tooltip";
import {
  CARD_CONDITION_LABELS,
  CARD_CONDITIONS,
} from "@/lib/cards/types";
import {
  emptyCollectionFormValues,
  parseCollectionFormInput,
  type CollectionFieldErrors,
  type CollectionFormValues,
} from "@/lib/cards/schema";

type OwnedCardFormProps = {
  mode: "create" | "edit";
  title: string;
  subtitle: string;
  initialValues?: CollectionFormValues;
  activeUserId: string | null;
  pending: boolean;
  serverError?: string | null;
  cancelLabel?: string;
  onCancel: () => void;
  onSubmit: (values: CollectionFormValues) => Promise<boolean>;
};

export function OwnedCardForm({
  mode,
  title,
  subtitle,
  initialValues,
  activeUserId,
  pending,
  serverError,
  cancelLabel,
  onCancel,
  onSubmit,
}: OwnedCardFormProps) {
  const [values, setValues] = useState<CollectionFormValues>(
    () => initialValues ?? emptyCollectionFormValues,
  );
  const [fieldErrors, setFieldErrors] = useState<CollectionFieldErrors>({});

  function updateValue<K extends keyof CollectionFormValues>(
    field: K,
    value: CollectionFormValues[K],
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = parseCollectionFormInput(values);

    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors);
      return;
    }

    setFieldErrors({});
    const success = await onSubmit(values);

    if (success && mode === "create") {
      setValues(emptyCollectionFormValues);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="selection-card">
        <strong>{title}</strong>
        <span>{subtitle}</span>
        <p>저장 대상 사용자: {activeUserId ?? "미선택"}</p>
      </div>

      {serverError ? <div className="alert alert-error">{serverError}</div> : null}

      <div className="field-row">
        <div className="field">
          <label htmlFor="quantity">수량</label>
          <input
            id="quantity"
            inputMode="numeric"
            value={values.quantity}
            onChange={(event) => updateValue("quantity", event.target.value)}
            placeholder="1"
            disabled={pending}
          />
          {fieldErrors.quantity ? (
            <span className="field-error">{fieldErrors.quantity}</span>
          ) : null}
        </div>

        <div className="field">
          <div className="field-label-row">
            <label htmlFor="condition">상태</label>
            <ConditionHelpTooltip />
          </div>
          <select
            id="condition"
            value={values.condition}
            onChange={(event) =>
              updateValue("condition", event.target.value as CollectionFormValues["condition"])
            }
            disabled={pending}
          >
            {CARD_CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {CARD_CONDITION_LABELS[condition]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="acquiredAt">구매일</label>
        <input
          id="acquiredAt"
          type="date"
          value={values.acquiredAt}
          onChange={(event) => updateValue("acquiredAt", event.target.value)}
          disabled={pending}
        />
        {fieldErrors.acquiredAt ? (
          <span className="field-error">{fieldErrors.acquiredAt}</span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="memo">메모</label>
        <textarea
          id="memo"
          rows={3}
          value={values.memo}
          onChange={(event) => updateValue("memo", event.target.value)}
          placeholder="보관 위치, 구매처, 교환 메모 등을 적어두세요."
          disabled={pending}
        />
        {fieldErrors.memo ? <span className="field-error">{fieldErrors.memo}</span> : null}
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "저장 중..." : mode === "create" ? "내 목록에 저장" : "수정 저장"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={pending}>
          {cancelLabel ?? "선택 해제"}
        </button>
      </div>
    </form>
  );
}
