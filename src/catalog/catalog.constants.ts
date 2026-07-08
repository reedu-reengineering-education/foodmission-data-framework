// Used in the app, then saved in preferences
export const SHOPPING_RESPONSIBILITY_ENTRIES = [
  {
    code: 'NO_SPECIFIC',
    key: 'shoppingResponsibilities.NO_SPECIFIC',
    fallback: 'No specific answer',
  },
  {
    code: 'MOSTLY_ME',
    key: 'shoppingResponsibilities.MOSTLY_ME',
    fallback: 'Mostly me',
  },
  {
    code: 'SHARED_EQUALLY',
    key: 'shoppingResponsibilities.SHARED_EQUALLY',
    fallback: 'Shared equally',
  },
  {
    code: 'MOSTLY_SOMEONE_ELSE',
    key: 'shoppingResponsibilities.MOSTLY_SOMEONE_ELSE',
    fallback: 'Mostly someone else',
  },
  {
    code: 'SOMEONE_ELSE',
    key: 'shoppingResponsibilities.SOMEONE_ELSE',
    fallback: 'Someone else',
  },
] as const;
