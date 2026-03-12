export const TEST_IDS = {
  USER: 'test-user-id',
  PANTRY: 'test-pantry-id',
  PANTRY_ITEM: 'test-pantry-item-id',
  FOOD: 'test-food-id',
  USER_GROUP: 'test-group-id',
  GROUP_MEMBERSHIP: 'test-membership-id',
  VIRTUAL_MEMBER: 'test-virtual-member-id',
} as const;

export const TEST_DATA = {
  PANTRY_TITLE: 'Test Pantry',
  PANTRY_TITLE_2: 'Second Test Pantry',
  NOTES: 'Test notes',
  QUANTITY: 2,
  GROUP_NAME: 'Test Family Group',
  GROUP_DESCRIPTION: 'A test group for family',
  INVITE_CODE: 'test-invite-code-123',
  VIRTUAL_MEMBER_NICKNAME: 'Test Child',
} as const;

export const TEST_DATES = {
  EXPIRY: new Date('2027-02-02'),
} as const;
