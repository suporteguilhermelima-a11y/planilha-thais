/**
 * Stress Test — k6
 * Uso: k6 run tests/stress/load-test.js
 * Em produção: k6 run -e BASE_URL=https://meu-app.com tests/stress/load-test.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Rampa: 0 → 20 usuários
    { duration: '1m',  target: 20 },   // Sustenta 20 usuários (load test)
    { duration: '30s', target: 100 },  // Pico: 20 → 100 usuários (stress)
    { duration: '30s', target: 0 },    // Descida
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% das req abaixo de 500ms
    http_req_failed:   ['rate<0.01'],  // menos de 1% de erro
  },
};

export default function () {
  // Teste 1: Página principal
  const home = http.get(`${BASE_URL}/`);
  check(home, {
    'home 200':    (r) => r.status === 200,
    'home <400ms': (r) => r.timings.duration < 400,
  });

  sleep(1);

  // Teste 2: Endpoint de API — ajuste a rota abaixo
  const api = http.get(`${BASE_URL}/api/seu-endpoint`);
  check(api, {
    'api 200':    (r) => r.status === 200,
    'api <500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
