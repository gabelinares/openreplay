import { Modal, type ModalFuncProps } from 'antd';
import i18next from 'i18next';
import React from 'react';

const t = i18next.t.bind(i18next);

/* One question, one wording, ONE look wherever an action fires (Gabriel
   07-21). The look is the app's dialog grammar — the Issues Hide modal:
   a standard dialog (no exclamation icon, default width), the subject
   quoted in a gray body line. Used from drawers AND row menus, so every
   destructive confirm is the same centered dialog.

   The grammar: you DISMISS a suggestion (agent-proposed draft) — red,
   confirmed, no reason (Gabriel 07-21 round 2: reason dropped); you DELETE
   your own work (tests, user drafts). */

const LOOK: ModalFuncProps = { icon: null, width: 520 };

const body = (text: string) => (
  <p className="mb-0" style={{ color: 'var(--color-gray-dark)' }}>
    {text}
  </p>
);

export const confirmDismissSuggestion = (title: string, onOk: () => void) =>
  Modal.confirm({
    ...LOOK,
    title: t('Dismiss this suggestion?'),
    content: body(
      t('“{{title}}” will be removed from your tests.', { title }),
    ),
    okText: t('Dismiss'),
    okButtonProps: { danger: true },
    cancelText: t('Cancel'),
    onOk,
  });

export const confirmDelete = (opts: {
  /** "test" | "draft" | "3 tests" — slots into the title */
  what: string;
  /** the item's name, quoted in the body like the Hide modal quotes the issue */
  name?: string;
  /** extra sentence when the deletion has side effects worth naming */
  consequence?: string;
  onOk: () => void;
}) => {
  const line = [
    opts.name
      ? t('“{{name}}” will be deleted.', { name: opts.name })
      : undefined,
    opts.consequence,
  ]
    .filter(Boolean)
    .join(' ');
  Modal.confirm({
    ...LOOK,
    // "Delete this test?" vs bulk "Delete 3 tests?"
    title: /^\d/.test(opts.what)
      ? t('Delete {{what}}?', { what: opts.what })
      : t('Delete this {{what}}?', { what: opts.what }),
    content: line ? body(line) : undefined,
    okText: t('Delete'),
    okButtonProps: { danger: true },
    cancelText: t('Cancel'),
    onOk: opts.onOk,
  });
};
