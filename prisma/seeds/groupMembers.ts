import {
  PrismaClient,
  GroupMembership,
  Gender,
  ActivityLevel,
  AnnualIncomeLevel,
  GroupRole,
} from '@prisma/client';

export interface VirtualMemberSeedData {
  groupName: string;
  createdByEmail: string;
  nickname: string;
  age?: number;
  gender?: Gender;
  activityLevel?: ActivityLevel;
  annualIncome?: AnnualIncomeLevel;
}

export const virtualMemberData: VirtualMemberSeedData[] = [
  {
    groupName: 'Doe Family',
    createdByEmail: 'john.doe@example.com',
    nickname: 'Little Timmy',
    age: 8,
    gender: Gender.MALE,
    activityLevel: ActivityLevel.VERY_ACTIVE,
  },
  {
    groupName: 'Doe Family',
    createdByEmail: 'john.doe@example.com',
    nickname: 'Sarah',
    age: 12,
    gender: Gender.FEMALE,
    activityLevel: ActivityLevel.MODERATE,
  },
];

export async function seedVirtualMembers(
  prisma: PrismaClient,
): Promise<GroupMembership[]> {
  console.log('👥 Seeding virtual members...');

  const createdMembers: GroupMembership[] = [];

  for (const vmData of virtualMemberData) {
    const group = await prisma.userGroup.findFirst({
      where: { name: vmData.groupName },
    });

    if (!group) {
      console.warn(
        `⚠️  Group not found for virtual member ${vmData.nickname}, skipping...`,
      );
      continue;
    }

    const creator = await prisma.user.findUnique({
      where: { email: vmData.createdByEmail },
    });

    if (!creator) {
      console.warn(
        `⚠️  Creator not found for virtual member ${vmData.nickname}, skipping...`,
      );
      continue;
    }

    const existingVM = await prisma.groupMembership.findFirst({
      where: {
        groupId: group.id,
        nickname: vmData.nickname,
        userId: null,
      },
    });

    if (existingVM) {
      console.log(
        `   ✓ Virtual member "${vmData.nickname}" already exists, skipping...`,
      );
      createdMembers.push(existingVM);
      continue;
    }

    const virtualMember = await prisma.groupMembership.create({
      data: {
        groupId: group.id,
        userId: null, // Virtual members have no associated user account
        role: GroupRole.MEMBER,
        createdBy: creator.id,
        nickname: vmData.nickname,
        age: vmData.age,
        gender: vmData.gender,
        activityLevel: vmData.activityLevel,
        annualIncome: vmData.annualIncome,
      },
    });

    console.log(
      `   ✓ Created virtual member "${virtualMember.nickname}" in group "${vmData.groupName}"`,
    );
    createdMembers.push(virtualMember);
  }

  console.log(`   ✅ Seeded ${createdMembers.length} virtual members`);
  return createdMembers;
}
