// apps/server/prisma/seed.ts
import { PrismaClient, UserRole, ShowtimeStatus, SeatType } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  // Simple SHA-256 for test seed (in production use bcrypt or argon2)
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🌱 Starting Lead Row database seed...');

  // 1. Seed Users
  console.log('Seeding users...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@leadrow.com' },
    update: {},
    create: {
      email: 'admin@leadrow.com',
      fullName: 'System Administrator',
      passwordHash: hashPassword('AdminSecurePass123!'),
      role: UserRole.ADMIN,
    },
  });

  const testCustomer = await prisma.user.upsert({
    where: { email: 'customer@leadrow.com' },
    update: {},
    create: {
      email: 'customer@leadrow.com',
      fullName: 'Test Customer',
      passwordHash: hashPassword('CustomerPass123!'),
      role: UserRole.CUSTOMER,
    },
  });

  console.log(`✓ Users created: ${adminUser.email}, ${testCustomer.email}`);

  // 2. Seed Cinemas
  console.log('Seeding cinemas...');
  let cinemaIkeja = await prisma.cinema.findFirst({
    where: { name: 'Silverbird Cinemas Ikeja' },
  });
  if (!cinemaIkeja) {
    cinemaIkeja = await prisma.cinema.create({
      data: {
        name: 'Silverbird Cinemas Ikeja',
        address: 'Ikeja City Mall, Obafemi Awolowo Way, Alausa, Ikeja',
        city: 'Lagos',
        timezone: 'Africa/Lagos',
        isActive: true,
      },
    });
  }

  let cinemaLekki = await prisma.cinema.findFirst({
    where: { name: 'Filmhouse IMAX Lekki' },
  });
  if (!cinemaLekki) {
    cinemaLekki = await prisma.cinema.create({
      data: {
        name: 'Filmhouse IMAX Lekki',
        address: 'The Rock Drive, off Bisola Durosinmi Etti Drive, Lekki Phase 1',
        city: 'Lagos',
        timezone: 'Africa/Lagos',
        isActive: true,
      },
    });
  }
  console.log(`✓ Cinemas ready: ${cinemaIkeja.name}, ${cinemaLekki.name}`);

  // 3. Seed Auditoriums & Seats
  console.log('Seeding auditoriums & seats...');
  let screen1 = await prisma.auditorium.findFirst({
    where: { cinemaId: cinemaIkeja.id, name: 'Screen 1 (Standard)' },
  });
  if (!screen1) {
    screen1 = await prisma.auditorium.create({
      data: {
        cinemaId: cinemaIkeja.id,
        name: 'Screen 1 (Standard)',
        layoutVersion: 1,
      },
    });

    // Create 120 seats: Rows A to J (10 rows), 12 seats each
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const seatData = [];

    for (const row of rows) {
      for (let num = 1; num <= 12; num++) {
        let type: SeatType = SeatType.STANDARD;
        if (row === 'A' && (num === 1 || num === 2)) {
          type = SeatType.WHEELCHAIR_ACCESSIBLE;
        } else if (row === 'I' || row === 'J') {
          type = SeatType.VIP;
        }

        seatData.push({
          auditoriumId: screen1.id,
          rowLabel: row,
          seatNumber: num,
          seatType: type,
        });
      }
    }

    await prisma.seat.createMany({
      data: seatData,
      skipDuplicates: true,
    });
    console.log(`✓ Screen 1 seeded with ${seatData.length} seats.`);
  }

  let imaxHall = await prisma.auditorium.findFirst({
    where: { cinemaId: cinemaLekki.id, name: 'IMAX Hall' },
  });
  if (!imaxHall) {
    imaxHall = await prisma.auditorium.create({
      data: {
        cinemaId: cinemaLekki.id,
        name: 'IMAX Hall',
        layoutVersion: 1,
      },
    });

    // Create 160 seats: Rows A to H (8 rows), 20 seats each
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seatData = [];

    for (const row of rows) {
      for (let num = 1; num <= 20; num++) {
        let type: SeatType = SeatType.STANDARD;
        if (row === 'A' && (num === 1 || num === 2)) {
          type = SeatType.WHEELCHAIR_ACCESSIBLE;
        } else if (row === 'G' || row === 'H') {
          type = SeatType.VIP;
        }

        seatData.push({
          auditoriumId: imaxHall.id,
          rowLabel: row,
          seatNumber: num,
          seatType: type,
        });
      }
    }

    await prisma.seat.createMany({
      data: seatData,
      skipDuplicates: true,
    });
    console.log(`✓ IMAX Hall seeded with ${seatData.length} seats.`);
  }

  // 4. Seed Movies (TMDB real movie metadata)
  console.log('Seeding movies...');

  const phoenixFury = await prisma.movie.upsert({
    where: { tmdbId: 1532702 },
    update: {},
    create: {
      tmdbId: 1532702,
      title: 'Phoenix Fury',
      overview:
        'When Ewura-Ama, recently widowed, inherits Utopia Valley, a luxury resort tucked in the quiet hills of Ghana, her search for solitude is disrupted by the arrival of a high-profile guest. Their uneasy encounter stirs tensions that awaken secrets buried decades ago.',
      posterPath: '/g6orCbnrC5xcuLIqiKhHHVhlxnq.jpg',
      backdropPath: '/7kqE2rZp7he8x1sr1Xc1TKq9DNh.jpg',
      releaseDate: new Date('2026-10-30'),
      runtime: 131,
      voteAverage: 7.2,
    },
  });

  const blackMarket = await prisma.movie.upsert({
    where: { tmdbId: 1738244 },
    update: {},
    create: {
      tmdbId: 1738244,
      title: 'Black Market',
      overview:
        'When a rival kidnaps Adesua’s daughter and threatens to burn everything down, the crew faces their most dangerous job yet, one wrong move and they lose more than the money. They lose each other.',
      posterPath: '/cMzsN8tcNkDfsrzNusoosCbbEM5.jpg',
      backdropPath: '/53nElz0dTOZtmjQ4xtnlHsKfdNs.jpg',
      releaseDate: new Date('2026-10-01'),
      runtime: 93,
      voteAverage: 6.9,
    },
  });

  const wildwood = await prisma.movie.upsert({
    where: { tmdbId: 791523 },
    update: {},
    create: {
      tmdbId: 791523,
      title: 'Wildwood',
      overview:
        'After her baby brother is abducted by a murder of crows, headstrong teenager Prue McKeel launches a desperate rescue mission into the Impassable Wilderness, an enchanted forest hidden just beyond Portland, Oregon.',
      posterPath: '/snFM00mpNAfUzUtkdEW0uDEvXA0.jpg',
      backdropPath: '/sl5NJ1vtyhP9Vr88bB4blULsJYp.jpg',
      releaseDate: new Date('2026-10-19'),
      runtime: 132,
      voteAverage: 8.7,
    },
  });

  const dune = await prisma.movie.upsert({
    where: { tmdbId: 693134 },
    update: {},
    create: {
      tmdbId: 693134,
      title: 'Dune: Part Two',
      overview:
        'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.',
      posterPath: '/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg',
      backdropPath: '/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
      releaseDate: new Date('2024-03-01'),
      runtime: 166,
      voteAverage: 8.2,
    },
  });

  const deadpool = await prisma.movie.upsert({
    where: { tmdbId: 533535 },
    update: {},
    create: {
      tmdbId: 533535,
      title: 'Deadpool & Wolverine',
      overview:
        'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again with an even more reluctant Wolverine.',
      posterPath: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
      backdropPath: '/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg',
      releaseDate: new Date('2024-07-26'),
      runtime: 128,
      voteAverage: 7.7,
    },
  });

  const gladiator = await prisma.movie.upsert({
    where: { tmdbId: 558449 },
    update: {},
    create: {
      tmdbId: 558449,
      title: 'Gladiator II',
      overview:
        'Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius must enter the Colosseum after his home is conquered by the tyrannical Emperors who now lead Rome with an iron fist.',
      posterPath: '/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg',
      backdropPath: '/tOqIwliWMovSIZ9DyvHcHI7p2im.jpg',
      releaseDate: new Date('2024-11-22'),
      runtime: 148,
      voteAverage: 6.8,
    },
  });

  console.log(`✓ Movies ready: ${phoenixFury.title}, ${blackMarket.title}, ${wildwood.title}, ${gladiator.title}, ${deadpool.title}, ${dune.title}`);

  // 5. Seed Showtimes (Pricing in NGN kobo minor units)
  console.log('Seeding showtimes...');
  const now = new Date();
  
  // Helper to construct future dates with specific hours
  const createShowtimeDate = (daysFromNow: number, hour: number, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, minute, 0, 0);
    // If it's today and already passed, shift to at least 1 hour from now
    if (d.getTime() <= now.getTime()) {
      d.setTime(now.getTime() + (daysFromNow + 1) * 3600 * 1000);
    }
    return d;
  };

  const showtimeDefinitions = [
    // Today
    { movie: phoenixFury, aud: screen1, start: createShowtimeDate(0, 14, 0), runtime: 131, price: 450000 },
    { movie: wildwood, aud: imaxHall, start: createShowtimeDate(0, 16, 30), runtime: 132, price: 650000 },
    { movie: blackMarket, aud: screen1, start: createShowtimeDate(0, 17, 30), runtime: 93, price: 400000 },
    { movie: gladiator, aud: imaxHall, start: createShowtimeDate(0, 19, 45), runtime: 148, price: 700000 },
    { movie: deadpool, aud: screen1, start: createShowtimeDate(0, 20, 30), runtime: 128, price: 500000 },

    // Tomorrow
    { movie: wildwood, aud: screen1, start: createShowtimeDate(1, 13, 0), runtime: 132, price: 450000 },
    { movie: phoenixFury, aud: imaxHall, start: createShowtimeDate(1, 15, 30), runtime: 131, price: 650000 },
    { movie: gladiator, aud: screen1, start: createShowtimeDate(1, 18, 0), runtime: 148, price: 500000 },
    { movie: deadpool, aud: imaxHall, start: createShowtimeDate(1, 19, 0), runtime: 128, price: 700000 },
    { movie: dune, aud: screen1, start: createShowtimeDate(1, 21, 0), runtime: 166, price: 500000 },

    // Day 2
    { movie: blackMarket, aud: imaxHall, start: createShowtimeDate(2, 14, 0), runtime: 93, price: 600000 },
    { movie: wildwood, aud: screen1, start: createShowtimeDate(2, 16, 0), runtime: 132, price: 450000 },
    { movie: gladiator, aud: imaxHall, start: createShowtimeDate(2, 18, 30), runtime: 148, price: 700000 },
    { movie: phoenixFury, aud: screen1, start: createShowtimeDate(2, 19, 30), runtime: 131, price: 450000 },
    { movie: dune, aud: imaxHall, start: createShowtimeDate(2, 21, 30), runtime: 166, price: 750000 },

    // Day 3
    { movie: deadpool, aud: screen1, start: createShowtimeDate(3, 14, 0), runtime: 128, price: 450000 },
    { movie: wildwood, aud: imaxHall, start: createShowtimeDate(3, 17, 0), runtime: 132, price: 650000 },
    { movie: gladiator, aud: screen1, start: createShowtimeDate(3, 19, 30), runtime: 148, price: 500000 },
  ];

  for (const item of showtimeDefinitions) {
    const end = new Date(item.start.getTime() + item.runtime * 60 * 1000);
    const existing = await prisma.showtime.findFirst({
      where: {
        movieId: item.movie.id,
        auditoriumId: item.aud.id,
        startTime: item.start,
      },
    });

    if (!existing) {
      await prisma.showtime.create({
        data: {
          movieId: item.movie.id,
          auditoriumId: item.aud.id,
          startTime: item.start,
          endTime: end,
          basePriceKobo: item.price,
          currency: 'NGN',
          status: ShowtimeStatus.BOOKING_OPEN,
        },
      });
    }
  }

  console.log(`✓ Seeded ${showtimeDefinitions.length} showtimes successfully across Ikeja & Lekki.`);
  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

