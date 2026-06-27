import { PrismaClient } from "@prisma/client";
import { addYears } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 建立管理員用戶（需要先透過 OAuth 登入一次，然後更新 role）
  // 這裡示範如何建立 seed 事件資料

  // 建立範例賽事
  const event = await prisma.event.upsert({
    where: { slug: "first-national-championship-2026" },
    update: {},
    create: {
      name: "第一屆中華台北羽球3對3全國錦標賽",
      slug: "first-national-championship-2026",
      date: new Date("2026-12-20"),
      location: "臺北體育館 7樓羽球館",
      registrationStart: new Date("2026-09-01"),
      registrationEnd: new Date("2026-11-15"),
      poster: "/images/33比賽.jpg",
      description: `首屆由本協會主辦之全國性羽球3對3錦標賽，設有A/B/C/D四組，依年齡進行分組競賽。

會員享NT$200報名費優惠，全體參賽選手均可獲得紀念品，各組另設有豐富獎品。

比賽規則：
- 每隊固定3名選手
- 年齡計算以比賽當日為準
- 身分證字號不可重複報名`,
      isOpen: true,
      maxTeamsPerGroup: 16,
    },
  });

  console.log("✅ Created event:", event.name);

  // 建立組別
  const groupsData = [
    {
      name: "A組",
      minTotalAge: 150,
      minIndividualAge: 45,
      allowedGenders: ["MALE_TRIPLE", "FEMALE_TRIPLE", "MIXED"],
      maxTeams: 16,
    },
    {
      name: "B組",
      minTotalAge: 165,
      minIndividualAge: 50,
      allowedGenders: ["MALE_TRIPLE", "FEMALE_TRIPLE", "MIXED"],
      maxTeams: 16,
    },
    {
      name: "C組",
      minTotalAge: 180,
      minIndividualAge: 55,
      allowedGenders: ["MALE_TRIPLE", "FEMALE_TRIPLE", "MIXED"],
      maxTeams: 16,
    },
    {
      name: "D組",
      minTotalAge: 195,
      minIndividualAge: 60,
      allowedGenders: ["MALE_TRIPLE", "FEMALE_TRIPLE", "MIXED"],
      maxTeams: 16,
    },
  ];

  for (const groupData of groupsData) {
    const existing = await prisma.eventGroup.findFirst({
      where: { eventId: event.id, name: groupData.name },
    });
    if (!existing) {
      await prisma.eventGroup.create({
        data: { ...groupData, eventId: event.id } as Parameters<typeof prisma.eventGroup.create>[0]["data"],
      });
      console.log(`✅ Created group: ${groupData.name}`);
    }
  }

  // 建立公告
  await prisma.announcement.upsert({
    where: { id: "announce-001" },
    update: {},
    create: {
      id: "announce-001",
      title: "第一屆中華台北羽球3對3全國錦標賽報名開始！",
      content: `親愛的羽球愛好者，

第一屆中華台北羽球3對3全國錦標賽即日起開放報名！

比賽日期：2026年12月20日（星期日）
比賽地點：臺北體育館 7樓羽球館
報名截止：2026年11月15日

共設 A/B/C/D 四個組別，依年齡分組。
詳情請至賽事列表查看。`,
      isPublished: true,
    },
  });

  console.log("✅ Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
