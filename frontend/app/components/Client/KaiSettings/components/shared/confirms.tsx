import { App } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

/* THE confirm dialogs — one hook, used from drawers and row menus alike, so
   every destructive question is literally the same component (Gabriel 07-21:
   these agent features graduate into a standalone product; no one-off
   dialogs).

   Rendered through App.useApp()'s modal, NOT the static Modal.confirm: the
   static call mounts outside ConfigProvider and misses the app theme (corner
   radius, fonts, colors) — that's the inconsistency Gabriel caught. The look
   matches the app's dialog grammar (the Issues Hide modal): no exclamation
   icon, default width/position, subject quoted in a gray body line.

   The grammar: you DISMISS a suggestion (agent-proposed draft) — red,
   confirmed, no reason; you DELETE your own work (tests, user drafts). */

const LOOK = { icon: null, width: 520 } as const;

const body = (text: string) => (
  <p className="mb-0" style={{ color: 'var(--color-gray-dark)' }}>
    {text}
  </p>
);

export function useConfirms() {
  const { modal } = App.useApp();
  const { t } = useTranslation();

  const confirmDismissSuggestion = (title: string, onOk: () => void) =>
    modal.confirm({
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

  const confirmDelete = (opts: {
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
    modal.confirm({
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

  // closing an editor with unsaved work — same dialog family
  const confirmDiscard = (onOk: () => void) =>
    modal.confirm({
      ...LOOK,
      title: t('Discard unsaved changes?'),
      okText: t('Discard'),
      okButtonProps: { danger: true },
      cancelText: t('Keep editing'),
      onOk,
    });

  return { confirmDismissSuggestion, confirmDelete, confirmDiscard };
}
