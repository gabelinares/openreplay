export const PANEL_SIZES = {
  /** the app-wide content width: preferences pages, Data Management, Audits,
   *  the Issues list. Wide enough for a data table's columns. */
  maxWidth: '1360px',
  /** the width for SETTINGS content — labelled rows with a control on the
   *  right, plus the occasional small table (Preferences > Agents, the Tests
   *  page's Environments tab). Narrower on purpose: at 1360 a row's control
   *  ends up ~900px from the label it belongs to and they stop reading as one
   *  row (Gabriel 07-30). */
  settingsMaxWidth: '1024px',
};
