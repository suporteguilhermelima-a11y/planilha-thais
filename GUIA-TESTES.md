# Guia de Testes: Code Review, Stress Test e Rate Limiting

Manual prático para rodar em qualquer projeto web (Next.js, Node, Python, etc.)

---

## INDICE

1. [Code Review — Checklist](#1-code-review--checklist)
2. [Configurar GitHub para Code Review](#2-configurar-github-para-code-review)
3. [Stress Test com k6](#3-stress-test-com-k6)
4. [Stress Test com Artillery](#4-stress-test-com-artillery)
5. [Testar Rate Limiting](#5-testar-rate-limiting)
6. [Checklist de Segurança OWASP](#6-checklist-de-segurança-owasp)
7. [Rodar Tudo no Antigravity](#7-rodar-tudo-no-antigravity)

---

## 1. Code Review — Checklist

### Como autor do PR (antes de pedir review)

```
[ ] PR tem menos de 400 linhas de código
[ ] Um PR = uma funcionalidade/bug (não misture)
[ ] Rodei o projeto localmente e testei o fluxo principal
[ ] Rodei os testes automatizados e passaram
[ ] Revisei meu próprio diff (sem logs de debug, sem secrets)
[ ] Nenhuma credencial, token ou senha no código
[ ] Descrição do PR explica o PORQUÊ da mudança
[ ] Adicionei ou atualizei os testes necessários
```

### Como revisor (ao receber um PR)

```
FUNCIONALIDADE
[ ] O código faz o que a descrição diz?
[ ] Cobre casos de borda (input vazio, null, erro de rede)?
[ ] Tem testes cobrindo os cenários principais?

DESIGN E LEGIBILIDADE
[ ] Outro dev entende o código em menos de 5 minutos?
[ ] Nomes de variáveis/funções são descritivos?
[ ] Não tem lógica duplicada que poderia ser reutilizada?
[ ] Complexidade justificada (sem over-engineering)?

SEGURANÇA
[ ] Inputs do usuário são validados?
[ ] Sem SQL injection (usa ORM ou queries parametrizadas)?
[ ] Sem XSS (saída sanitizada)?
[ ] Autorização verificada em cada endpoint?
[ ] Sem secrets no código?

PERFORMANCE
[ ] Sem consultas N+1 ao banco?
[ ] Sem loops desnecessários em listas grandes?
[ ] Sem bloqueio da thread principal em operação pesada?

RATE LIMITING (endpoints sensíveis)
[ ] Endpoint de login tem rate limit?
[ ] Endpoint de reset de senha tem rate limit?
[ ] API pública tem rate limit por IP/token?
[ ] Retorna 429 quando limite é atingido?
```

---

## 2. Configurar GitHub para Code Review

### Passo 1 — Criar template de PR

Crie o arquivo abaixo na raiz do projeto:

```
.github/PULL_REQUEST_TEMPLATE.md
```

Conteúdo:

```markdown
## O que muda?
<!-- Descreva o problema que resolve e a abordagem escolhida -->

## Como testar?
1. 
2. 

## Checklist do autor
- [ ] Testei localmente
- [ ] Adicionei/atualizei testes
- [ ] Sem secrets no código
- [ ] PR tem menos de 400 linhas
- [ ] Revisei meu próprio diff
```

### Passo 2 — Ativar GitHub Actions para lint e testes

Crie o arquivo:

```
.github/workflows/quality.yml
```

Conteúdo para projetos Node/Next.js:

```yaml
name: Quality Check
on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Instalar dependências
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Testes
        run: npm test
```

### Passo 3 — Proteger a branch main

No GitHub:
```
Settings > Branches > Add branch ruleset
Nome: main
Marcar: Require a pull request before merging
Marcar: Require status checks to pass (selecione o job "check")
Marcar: Require at least 1 approval
```

---

## 3. Stress Test com k6

### Passo 1 — Instalar k6

```bash
# macOS
brew install k6

# Linux (Ubuntu/Debian)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Windows
winget install k6
```

### Passo 2 — Criar arquivo de teste

Crie na raiz do projeto: `tests/stress/load-test.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

// ⬇ MUDE AQUI para a URL da sua aplicação
const BASE_URL = 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Rampa: 0 → 20 usuários
    { duration: '1m',  target: 20 },   // Sustenta 20 usuários (load test)
    { duration: '30s', target: 100 },  // Pico: 20 → 100 usuários (stress test)
    { duration: '30s', target: 0 },    // Descida
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% das requisições abaixo de 500ms
    http_req_failed:   ['rate<0.01'],  // menos de 1% de erros
  },
};

export default function () {
  // Teste 1: Página principal
  const home = http.get(`${BASE_URL}/`);
  check(home, {
    'home status 200': (r) => r.status === 200,
    'home < 400ms':    (r) => r.timings.duration < 400,
  });

  sleep(1);

  // Teste 2: Endpoint de API (ajuste a rota)
  const api = http.get(`${BASE_URL}/api/seu-endpoint`);
  check(api, {
    'api status 200': (r) => r.status === 200,
    'api < 500ms':    (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### Passo 3 — Rodar o stress test

```bash
# Com o servidor rodando em outra aba:
npm run dev

# Rodar o teste
k6 run tests/stress/load-test.js

# Rodar apontando para produção
k6 run -e BASE_URL=https://meu-app.vercel.app tests/stress/load-test.js
```

### Passo 4 — Entender o resultado

```
✓ home status 200
✓ home < 400ms

checks.........................: 99.80%  ✓ 2394  ✗ 5
data_received..................: 4.5 MB  45 kB/s
http_req_duration..............: avg=120ms min=45ms med=98ms max=2.1s p(90)=210ms p(95)=380ms
http_req_failed................: 0.04%   ✓ 1197  ✗ 0
vus............................: 100     min=0  max=100
```

O que olhar:
- `p(95)` → 95% das requests ficaram abaixo desse tempo
- `http_req_failed` → taxa de erros (deve ser < 1%)
- `max` → tempo máximo (valores muito altos indicam timeout)

---

## 4. Stress Test com Artillery

### Passo 1 — Instalar Artillery

```bash
npm install -g artillery
```

### Passo 2 — Criar arquivo de teste

Crie: `tests/stress/artillery-test.yml`

```yaml
config:
  target: "http://localhost:3000"   # ← Mude para sua URL
  phases:
    - name: "Aquecimento"
      duration: 30
      arrivalRate: 5               # 5 usuários/segundo

    - name: "Carga normal"
      duration: 60
      arrivalRate: 20              # 20 usuários/segundo

    - name: "Pico de stress"
      duration: 30
      arrivalRate: 100             # 100 usuários/segundo

  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  - name: "Navegar no app"
    flow:
      - get:
          url: "/"
          expect:
            - statusCode: 200

      - get:
          url: "/api/seu-endpoint"
          expect:
            - statusCode: 200

  - name: "Login (exemplo)"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "teste@email.com"
            password: "senha-de-teste"
```

### Passo 3 — Rodar e gerar relatório

```bash
# Rodar
artillery run tests/stress/artillery-test.yml

# Rodar e salvar resultado
artillery run --output resultado.json tests/stress/artillery-test.yml

# Gerar relatório HTML (abre no browser)
artillery report resultado.json
```

---

## 5. Testar Rate Limiting

### Teste 1 — Verificar se o 429 está ativo (curl simples)

```bash
# Dispara 50 requests seguidas e mostra o status de cada uma
for i in $(seq 1 50); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST https://seu-app.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"teste@email.com","password":"errada"}')
  echo "Request $i: HTTP $STATUS"
done
```

O que esperar:
```
Request 1: HTTP 401      ← credencial errada, normal
Request 2: HTTP 401
...
Request 11: HTTP 429     ← rate limit ativado! (bom)
Request 12: HTTP 429
```

Se nunca aparecer 429: **seu rate limit não está funcionando.**

### Teste 2 — Bypass via headers (teste de segurança)

```bash
# Testa se o rate limiter pode ser enganado com IP falso
curl -X POST https://seu-app.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 1.2.3.4" \
  -d '{"email":"teste@email.com","password":"errada"}'

curl -X POST https://seu-app.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Real-IP: 9.9.9.9" \
  -d '{"email":"teste@email.com","password":"errada"}'
```

Se esses requests NÃO estiverem sendo limitados após muitos disparos:
**o rate limiter está contando por IP e aceita IPs falsificados — vulnerabilidade.**

### Teste 3 — Rate limit com k6 (mais poderoso)

Crie: `tests/stress/rate-limit-test.js`

```javascript
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = 'http://localhost:3000'; // ← Mude aqui

const hit429 = new Counter('hit_rate_limit_429');
const hit401 = new Counter('credencial_invalida_401');

export const options = {
  vus: 30,           // 30 usuários simultâneos
  duration: '15s',   // por 15 segundos
};

export default function () {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: 'teste@email.com', password: 'errada' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status === 429) hit429.add(1);
  if (res.status === 401) hit401.add(1);

  check(res, {
    'rate limit OU auth error': (r) => [401, 429].includes(r.status),
    'não deu 500': (r) => r.status !== 500,
  });

  // Log dos headers de rate limit (se existirem)
  const remaining = res.headers['X-RateLimit-Remaining'];
  if (remaining !== undefined) {
    console.log(`Remaining: ${remaining} | Status: ${res.status}`);
  }
}
```

```bash
k6 run tests/stress/rate-limit-test.js
```

### O que checar nos headers de resposta

```bash
# Ver todos os headers da sua API
curl -I https://seu-app.com/api/auth/login
```

Sua API DEVE retornar:
```
X-RateLimit-Limit: 10          ← limite total de requests
X-RateLimit-Remaining: 9       ← quantas ainda restam
X-RateLimit-Reset: 1750000000  ← timestamp Unix de quando reseta
Retry-After: 60                ← segundos para tentar de novo (no 429)
```

---

## 6. Checklist de Segurança OWASP

Use durante o code review de endpoints de API:

```
AUTENTICAÇÃO
[ ] Tokens JWT verificam assinatura, expiração e audience?
[ ] Senhas armazenadas com bcrypt ou argon2 (nunca MD5/SHA1)?
[ ] Login com credencial errada retorna sempre a mesma mensagem?
     (não dizer "email não encontrado" vs "senha errada")

AUTORIZAÇÃO
[ ] Cada endpoint verifica se o usuário TEM PERMISSÃO para aquele recurso?
[ ] IDOR testado? (usuario A não consegue ver dados do usuario B por ID?)
[ ] Rotas admin protegidas por role/permissão?

RATE LIMITING (OWASP API4:2023)
[ ] /api/login tem rate limit?
[ ] /api/forgot-password tem rate limit?
[ ] /api/register tem rate limit?
[ ] Endpoint que envia email/SMS tem rate limit?
[ ] Rate limiter NÃO confia em X-Forwarded-For do cliente?

VALIDAÇÃO DE INPUT
[ ] Todos os campos validados no servidor (não só no frontend)?
[ ] Tamanho máximo de string definido?
[ ] Upload: valida tipo MIME e tamanho máximo?
[ ] Sem eval() ou execução dinâmica de código do usuário?

EXPOSIÇÃO DE DADOS
[ ] Response não retorna campos sensíveis (senha, token interno, PII)?
[ ] Erros não expõem stack trace para o cliente?
[ ] Logs não gravam senhas, tokens ou dados pessoais?

CONFIGURAÇÃO
[ ] CORS configurado com origem específica (não *)?
[ ] HTTPS forçado (redirect de HTTP)?
[ ] Dependências sem vulnerabilidades conhecidas? (npm audit)
```

---

## 7. Rodar Tudo no Antigravity

Adapte os passos abaixo para o projeto Antigravity.

### Setup inicial (uma vez só)

```bash
# Clonar e entrar no projeto
cd antigravity   # ou o caminho do seu projeto

# Instalar k6 (se ainda não tiver)
brew install k6          # macOS
# ou: sudo apt-get install k6  # Linux

# Instalar Artillery
npm install -g artillery

# Criar pasta de testes
mkdir -p tests/stress
```

### Copiar os arquivos de teste

Copie os arquivos criados nas seções acima para o projeto Antigravity e ajuste a variável `BASE_URL` e os endpoints reais do seu app.

```bash
# Dentro do projeto Antigravity:
# Edite tests/stress/load-test.js e troque:
#   const BASE_URL = 'http://localhost:3000'
# pelo endereço do seu projeto (ex: porta 8000, 4000, etc.)
```

### Sequência de testes recomendada

```bash
# PASSO 1: Subir o servidor local em uma aba
npm run dev          # Next.js
# ou: npm start / python manage.py runserver / etc.

# PASSO 2: Em outra aba — rodar o load test (carga normal)
k6 run tests/stress/load-test.js

# PASSO 3: Rodar contra produção (stress test de verdade)
k6 run -e BASE_URL=https://antigravity.vercel.app tests/stress/load-test.js

# PASSO 4: Testar rate limiting no endpoint de login
bash -c 'for i in $(seq 1 30); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST https://antigravity.vercel.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test@test.com\",\"password\":\"errada\"}")
  echo "Request $i: HTTP $STATUS"
done'

# PASSO 5: Gerar relatório HTML do Artillery
artillery run --output resultado.json tests/stress/artillery-test.yml
artillery report resultado.json    # abre no browser
```

### Interpretar os resultados

| Métrica | Saudável | Atenção | Crítico |
|---------|----------|---------|---------|
| p(95) latência | < 500ms | 500ms–1s | > 1s |
| Taxa de erro | < 1% | 1–5% | > 5% |
| Rate limit 429 | aparece após N req | - | nunca aparece (bug) |
| Headers RateLimit | presentes | - | ausentes |

---

## Resumo rápido de comandos

```bash
# Instalar ferramentas
brew install k6
npm install -g artillery

# Stress test básico
k6 run tests/stress/load-test.js

# Stress test em produção
k6 run -e BASE_URL=https://meu-app.com tests/stress/load-test.js

# Teste de rate limit manual (30 requests)
for i in $(seq 1 30); do
  echo "Req $i: $(curl -s -o /dev/null -w '%{http_code}' -X POST SEU_ENDPOINT_LOGIN)"
done

# Relatório Artillery
artillery run --output resultado.json tests/stress/artillery-test.yml && artillery report resultado.json

# Verificar vulnerabilidades nas dependências
npm audit
npm audit fix
```
