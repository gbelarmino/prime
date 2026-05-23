# Prime no Dokploy

O Prime é um **Next.js com `output: 'export'`** — site estático servido por nginx na porta **3000**.

As variáveis `NEXT_PUBLIC_*` são **injetadas no build**. Alterar a URL da API exige **redeploy com novos Build Arguments**, não basta mudar env em runtime.

## 1. Novo projeto no Dokploy

| Campo | Valor |
|-------|--------|
| Tipo | **Application** → Dockerfile |
| Repositório | repo do `prime` |
| Dockerfile | `Dockerfile` (raiz) |
| Porta do container | **3000** |

## 2. Build Arguments (obrigatório)

| Argumento | Exemplo |
|-----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.domusparticipacoes.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://app.domusparticipacoes.com` |
| `NEXT_PUBLIC_SKIP_AUTH` | `false` |

Sem barra final na URL da API.

## 3. Domínio + HTTPS

Em **Domains**:

- Host: `app.domusparticipacoes.com` (ou o subdomínio que preferires)
- HTTPS + Let's Encrypt
- Porta: **3000**

Registo DNS (tipo A → IP da VPS):

```
app.domusparticipacoes.com  →  2.24.94.197
```

## 4. CORS na API

Na **aires-api**, incluir a origem do Prime em `AIRES_CORS_ALLOWED_ORIGINS`:

```
https://app.domusparticipacoes.com
```

(junto com portal, Firebase, etc.)

## 5. Certificado TLS da API

O dashboard chama a API em HTTPS. Garante que `api.domusparticipacoes.com` tem Let's Encrypt válido no serviço **aires-api** (não o certificado default do Traefik).

## 6. Deploy

1. Push do código com `Dockerfile`
2. Deploy no Dokploy
3. Testar: `https://app.domusparticipacoes.com/login`

## Troubleshooting

| Sintoma | Causa provável |
|---------|----------------|
| Login falha / CORS | Origem do Prime ausente em `AIRES_CORS_ALLOWED_ORIGINS` |
| API errada no browser | `NEXT_PUBLIC_API_BASE_URL` errado no build — redeploy com Build Args |
| 404 em rotas internas | nginx `try_files` — usar imagem com `nginx.conf` deste repo |
| Mixed content | Site em HTTPS mas API em HTTP — API também em HTTPS |
