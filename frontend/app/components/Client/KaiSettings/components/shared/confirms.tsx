import { Input, Modal } from 'antd';
import i18next from 'i18next';
import React from 'react';

const t = i18next.t.bind(i18next);

/* One question, one wording, wherever an action fires (Gabriel 07-21).
   Dropdown menus close on click, so anchored Popconfirms can't live there —
   these centered modals carry the SAME copy a drawer's Popconfirm uses, so
   the user always meets the same question.

   The grammar (approved 07-21):
   · you DISMISS a suggestion (agent-proposed draft) — red, confirmed, with an
     optional reason the agent can learn from (same pattern as the Issues
     "Mark as not critical" and Hide reason modals);
   · you DELETE your own work (tests, user drafts) — red, confirmed, no reason. */

export const confirmDismissSuggestion = (onOk: (reason: string) => void) => {
  // uncontrolled on purpose: Modal.confirm re-renders nothing, the closure
  // carries the reason out
  let reason = '';
  Modal.confirm({
    title: t('Dismiss this suggestion?'),
    content: (
      <div className="flex flex-col gap-2">
        <span>{t('It will be removed from your tests.')}</span>
        <Input.TextArea
          rows={2}
          maxLength={200}
          placeholder={t('Tell the agent why (optional)')}
          onChange={(e) => {
            reason = e.target.value;
          }}
        />
      </div>
    ),
    okText: t('Dismiss'),
    okButtonProps: { danger: true },
    cancelText: t('Cancel'),
    onOk: () => onOk(reason.trim()),
  });
};

export const confirmDelete = (opts: {
  /** "test" | "draft" | "3 tests" — slots into the title */
  what: string;
  /** extra line when the deletion has side effects worth naming */
  consequence?: string;
  onOk: () => void;
}) => {
  Modal.confirm({
    // "Delete this test?" vs bulk "Delete 3 tests?"
    title: /^\d/.test(opts.what)
      ? t('Delete {{what}}?', { what: opts.what })
      : t('Delete this {{what}}?', { what: opts.what }),
    content: opts.consequence,
    okText: t('Delete'),
    okButtonProps: { danger: true },
    cancelText: t('Cancel'),
    onOk: opts.onOk,
  });
};
