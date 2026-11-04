// apps/server/prisma/seed-week-showtimes.ts
import { PrismaClient, ShowtimeStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 1-week (Sunday to Saturday) showtimes...');

  // 1. Fetch auditoriums
  const screen1 = await prisma.auditorium.findFirst({
    where: { name: { contains: 'Screen 1' } },
  });
  const imaxHall = await prisma.auditorium.findFirst({
    where: { name: { contains: 'IMAX' } },
  });

  if (!screen1 || !imaxHall) {
    throw new Error('Auditoriums not found. Please ensure initial seed has run.');
  }

  // 2. Fetch movies
  const movies = await prisma.movie.findMany({ take: 6 });
  if (movies.length === 0) {
    throw new Error('No movies found in database.');
  }

  console.log(`Found ${movies.length} movies and 2 auditoriums.`);

  const now = new Date();

  // Create showtimes for the next 10 days to cover every day of the week (Sunday through Saturday)
  const timeSlots = [
    { hour: 13, minute: 0, aud: screen1, price: 450000 },
    { hour: 15, minute: 30, aud: imaxHall, price: 650000 },
    { hour: 17, minute: 0, aud: screen1, price: 500000 },
    { hour: 18, minute: 30, aud: imaxHall, price: 700000 },
    { hour: 20, minute: 0, aud: screen1, price: 500000 },
    { hour: 21, minute: 30, aud: imaxHall, price: 750000 },
  ];

  let createdCount = 0;

  // Offset 0 to 9 covers all 7 days of the week and into next week
  for (let dayOffset = 0; dayOffset <= 9; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + dayOffset);

    for (let slotIndex = 0; slotIndex < timeSlots.length; slotIndex++) {
      const slot = timeSlots[slotIndex];
      const movie = movies[(dayOffset + slotIndex) % movies.length];

      const startTime = new Date(targetDate);
      startTime.setHours(slot.hour, slot.minute, 0, 0);

      // Skip slots earlier than now + 30 mins
      if (startTime.getTime() <= now.getTime() + 30 * 60 * 1000) {
        continue;
      }

      const runtimeMinutes = movie.runtime || 120;
      const endTime = new Date(startTime.getTime() + runtimeMinutes * 60 * 1000);

      const existing = await prisma.showtime.findFirst({
        where: {
          movieId: movie.id,
          auditoriumId: slot.aud.id,
          startTime,
        },
      });

      if (!existing) {
        await prisma.showtime.create({
          data: {
            movieId: movie.id,
            auditoriumId: slot.aud.id,
            startTime,
            endTime,
            basePriceKobo: slot.price,
            currency: 'NGN',
            status: ShowtimeStatus.BOOKING_OPEN,
          },
        });
        createdCount++;
      }
    }
  }

  console.log(`✓ Successfully seeded ${createdCount} new showtimes across the full week!`);
}

main()
  .catch((e) => {
    console.error('Error seeding week showtimes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

