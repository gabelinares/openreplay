import React from 'react';
import { useTranslation } from 'react-i18next';

import PreferencesPage from '../PreferencesPage';
import CustomFields from './CustomFields';

/* Metadata as a Preferences PAGE.

   `CustomFields` renders in two places: here, and inside the Projects page's
   metadata tab (`Projects/ProjectTabContent.tsx`). So the page chrome cannot go
   in the component itself, or the Projects page would show a card inside a card.
   It goes here instead, and the component stays embeddable. */
export default function CustomFieldsPage() {
  const { t } = useTranslation();
  return (
    <PreferencesPage title={t('Metadata')}>
      <CustomFields />
    </PreferencesPage>
  );
}
