import http from 'k6/http';
import { check, sleep } from 'k6';

// 500 Virtual Users competing for 50 seats
export const options = {
  scenarios: {
    competing_holds: {
      executor: 'per-vu-iterations',
      vus: 500,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:4000';
const SHOWTIME_ID = __ENV.TEST_SHOWTIME_ID || '00000000-0000-0000-0000-000000000001';

export default function () {
  // Each VU picks from one of 50 target seats (creating guaranteed contention)
  const seatNumber = (__VU % 50) + 1;
  const seatId = `seat_row_a_${seatNumber}`;

  const payload = JSON.stringify({
    seatIds: [seatId],
    admissionToken: 'load-test-admission-token',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': `k6_vu_${__VU}_iter_${__ITER}`,
      'Authorization': `Bearer load-test-token-vu-${__VU}`,
    },
  };

  const res = http.post(`${BASE_URL}/v1/showtimes/${SHOWTIME_ID}/holds`, payload, params);

  // Status must be either 201 (acquired) or 409 (conflict). No 500 crashes allowed!
  check(res, {
    'status is 201 or 409': (r) => r.status === 201 || r.status === 409,
  });

  sleep(0.1);
}

