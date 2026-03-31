"use client";

import { useEffect, useId, useState } from "react";
import { CARD_CONDITION_DESCRIPTIONS } from "@/lib/cards/types";

type ConditionHelpTooltipProps = {
  className?: string;
};

export function ConditionHelpTooltip({ className }: ConditionHelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const dialogId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        className={`meta-help-trigger ${className ?? ""}`.trim()}
        type="button"
        aria-label="상태 기준 설명 보기"
        aria-haspopup="dialog"
        aria-controls={dialogId}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        ?
      </button>
      {open ? (
        <div
          className="condition-help-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            id={dialogId}
            className="condition-help-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="상태 기준"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="condition-help-header">
              <strong>상태 기준</strong>
              <button
                className="btn btn-secondary condition-help-close"
                type="button"
                onClick={() => setOpen(false)}
              >
                닫기
              </button>
            </div>
            <div className="condition-help-list">
              <span>미개봉: {CARD_CONDITION_DESCRIPTIONS.SEALED}</span>
              <span>최상: {CARD_CONDITION_DESCRIPTIONS.TOP}</span>
              <span>상: {CARD_CONDITION_DESCRIPTIONS.HIGH}</span>
              <span>중: {CARD_CONDITION_DESCRIPTIONS.MID}</span>
              <span>하: {CARD_CONDITION_DESCRIPTIONS.LOW}</span>
              <span>최하: {CARD_CONDITION_DESCRIPTIONS.POOR}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
