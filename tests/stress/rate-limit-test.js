/**
 * Teste de Rate Limiting — k6
 * Uso: k6 run tests/stress/rate-limit-test.js
 * Em produção: k6 run -e BASE_URL=https://meu-app.com tests/stress/rate-limit-test.js
 *
 * O que esperar:
 *   - Primeiras N requests: HTTP 401 (credencial errada)
 *   - Após o limite: HTTP 429 (rate limit ativado — BOM)
 *   - Se NUNCA aparecer 429: rate limit não está funcionando
 */
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Métricas customizadas para contar 429 e 401
const hit429 = new Counter('hit_rate_limit_429');
const hit401 = new Counter('credencial_invalida_401');

export const options = {
  vus: 30,           // 30 usuários simultâneos
  duration: '15s',   // por 15 segundos
};

export default function () {
  // Ajuste o endpoint e o payload para o seu projeto
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: 'teste@email.com', password: 'senha-errada' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status === 429) hit429.add(1);
  if (res.status === 401) hit401.add(1);

  check(res, {
    'resposta esperada (401 ou 429)': (r) => [401, 429].includes(r.status),
    'sem erro 500':                   (r) => r.status !== 500,
  });

  // Mostra os headers de rate limit se existirem
  const remaining = res.headers['X-RateLimit-Remaining'];
  if (remaining !== undefined) {
    console.log(`Remaining: ${remaining} | Status: ${res.status}`);
  }
}
