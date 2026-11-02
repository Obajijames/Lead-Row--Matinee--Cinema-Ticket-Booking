// apps/mobile/src/navigation/types.ts

export type MainTabParamList = {
  HomeTab: undefined;
  MoviesTab:
    | {
        initialSearch?: string;
        filter?: 'all' | 'now-playing' | 'upcoming' | 'active-showtimes';
        region?: 'GLOBAL' | 'NG';
      }
    | undefined;
  BookingsTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Home: undefined;
  MovieDetails: { movieId: string };
  Cinemas: { movieId: string };
  Showtimes: { movieId: string; cinemaId: string };
  SeatMap: { showtimeId: string };
  OrderReview: { holdToken: string; showtimeId: string };
  WaitingRoom: { showtimeId: string };
  Ticket: { ticketToken: string };
  BookingHistory: undefined;
  DevComponentGallery: undefined;
};
