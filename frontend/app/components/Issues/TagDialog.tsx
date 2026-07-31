import React from 'react';
import { Input, Modal } from 'antd';

/* THE journey-tag dialog — creating (from the Tags filter) and editing (from
   Preferences > Agents) share it: one dialog component, never per-callsite
   markup. App dialog grammar (Issues Hide modal): no icon, default width,
   explanation in a gray body line. The description IS the matching rule; the
   caption sets expectations so a zero-match tag is never a surprise.

   This dialog IS the intermediary layer (Gabriel 07-28, Mehdi: "we need
   something intermediary. Yes. Correct."): a small control in the Issues list
   must never drop the user straight into a settings page, so the tag is
   authored here, in flow. It holds no other action — one job, and the buttons
   in the footer (Gabriel 07-31); the way to the full list is the Settings
   button in the page header. */
export default function TagDialog({
  open,
  initial,
  onCancel,
  onSave,
}: {
  open: boolean;
  /** editing an existing tag; omit when creating */
  initial?: { name: string; description: string } | null;
  onCancel: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDesc(initial?.description ?? '');
    }
  }, [open, initial]);

  return (
    <Modal
      title={initial ? 'Edit journey tag' : 'New journey tag'}
      open={open}
      onCancel={onCancel}
      onOk={() => onSave(name.trim(), desc.trim())}
      okText={initial ? 'Save tag' : 'Create tag'}
      okButtonProps={{ disabled: !name.trim() || !desc.trim() }}
    >
      <p className="mb-3" style={{ color: 'var(--color-gray-dark)' }}>
        Describe the journey in plain words. The agent reads every captured
        session and applies the tag automatically when it matches.
      </p>
      <div className="flex flex-col gap-3">
        <Input
          autoFocus
          maxLength={40}
          placeholder="Name, e.g. Offer scheduling"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input.TextArea
          rows={3}
          maxLength={300}
          placeholder="e.g. Any session where the user schedules or reschedules an offer, from the offers page or the email link."
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <span className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
          Applies to sessions captured from now on; existing sessions are not
          re-scanned.
        </span>
      </div>
    </Modal>
  );
}
