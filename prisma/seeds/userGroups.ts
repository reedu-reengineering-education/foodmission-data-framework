import { PrismaClient, GroupRole, UserGroup } from '@prisma/client';

export interface UserGroupSeedData {
  name: string;
  description?: string;
  createdByEmail: string; // We'll use email to find the user
  memberEmails: { email: string; role: GroupRole }[];
}

export const userGroupData: UserGroupSeedData[] = [
  {
    name: 'Doe Family',
    description: 'The Doe family shopping and meal planning group',
    createdByEmail: 'john.doe@example.com',
    memberEmails: [
      { email: 'john.doe@example.com', role: GroupRole.ADMIN },
      { email: 'jane.smith@example.com', role: GroupRole.MEMBER },
    ],
  },
  {
    name: 'Roommates',
    description: 'Shared apartment groceries',
    createdByEmail: 'jane.smith@example.com',
    memberEmails: [
      { email: 'jane.smith@example.com', role: GroupRole.ADMIN },
      { email: 'mike.johnson@example.com', role: GroupRole.MEMBER },
    ],
  },
];

export async function seedUserGroups(prisma: PrismaClient): Promise<UserGroup[]> {
  console.log('🏠 Seeding user groups...');

  const createdGroups: UserGroup[] = [];

  for (const groupData of userGroupData) {
    // Find the creator by email
    const creator = await prisma.user.findUnique({
      where: { email: groupData.createdByEmail },
    });

    if (!creator) {
      console.warn(
        `⚠️  Creator not found for group ${groupData.name}, skipping...`,
      );
      continue;
    }

    // Check if group already exists
    const existingGroup = await prisma.userGroup.findFirst({
      where: {
        name: groupData.name,
        createdBy: creator.id,
      },
    });

    if (existingGroup) {
      console.log(`   ✓ Group "${groupData.name}" already exists, skipping...`);
      createdGroups.push(existingGroup);
      continue;
    }

    // Create the group
    const group = await prisma.userGroup.create({
      data: {
        name: groupData.name,
        description: groupData.description,
        createdBy: creator.id,
      },
    });

    // Add memberships
    for (const memberData of groupData.memberEmails) {
      const member = await prisma.user.findUnique({
        where: { email: memberData.email },
      });

      if (member) {
        await prisma.groupMembership.create({
          data: {
            userId: member.id,
            groupId: group.id,
            role: memberData.role,
          },
        });
      }
    }

    console.log(`   ✓ Created group "${group.name}" with ${groupData.memberEmails.length} members`);
    createdGroups.push(group);
  }

  console.log(`   ✅ Seeded ${createdGroups.length} user groups`);
  return createdGroups;
}
