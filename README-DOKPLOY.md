# Prime no Dokploy

O Prime é um **Next.js com `output: 'export'`** — site estático servido por nginx na porta **3000**.

A URL da API pode vir do **build** ou do **runtime** (recomendado no Dokploy).

## 1. Novo projeto no Dokploy

| Campo | Valor |
|-------|--------|
| Tipo | **Application** → Dockerfile |
| Repositório | repo do `prime` |
| Dockerfile | `Dockerfile` (raiz) |
| Porta do container | **3000** |

## 2. Variáveis de ambiente (Environment — recomendado)

Defina em **Environment** (não precisa rebuild ao mudar a URL):

| Variável | Exemplo |
|----------|---------|
| `API_BASE_URL` | `https://api.domusparticipacoes.com` |
| `NEXT_PUBLIC_SKIP_AUTH` | `false` |

Alternativa: `NEXT_PUBLIC_API_BASE_URL` com o mesmo valor.

Sem barra final. O `docker-entrypoint.sh` gera `/env-config.js` no arranque do container.

## 3. Build Arguments (opcional)

Útil se quiser a URL já no bundle (Firebase, etc.):

| Argumento | Exemplo |
|-----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.domusparticipacoes.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://app.domusparticipacoes.com` |

## 4. Domínio + HTTPS

- Host: `app.domusparticipacoes.com`
- HTTPS + Let's Encrypt
- Porta: **3000**

DNS (A → IP da VPS): `app.domusparticipacoes.com` → `2.24.94.197`

## 5. CORS na API

Incluir em `AIRES_CORS_ALLOWED_ORIGINS`:

```
https://app.domusparticipacoes.com
```

## 6. Deploy e teste

1. Push + deploy no Dokploy
2. Abrir `https://app.domusparticipacoes.com/env-config.js` — deve mostrar a URL da API
3. Login em `https://app.domusparticipacoes.com/login`

## Troubleshooting

| Sintoma | Causa provável |
|---------|----------------|
| «A API não está configurada» | Falta `API_BASE_URL` no Environment — redeploy/restart do container |
| `env-config.js` com URL vazia | Variável não definida ou nome errado (use `API_BASE_URL`) |
| Login falha / CORS | Origem ausente em `AIRES_CORS_ALLOWED_ORIGINS` |
| Mixed content | API deve ser HTTPS |
