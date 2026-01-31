# Server

Bun + tRPC → sidecar binary para Tauri.

## Estrutura

```
src/
├── config.ts          # Ports, URLs, Twitch config
├── index.ts           # Bootstrap do server
├── db/                # Kysely + migrations
├── lib/               # Helpers (ex: trpc, auth)
├── router/            # Routers tRPC
├── services/          # Lógica de domínio (Twitch)
└── test/              # Helpers/testes
```

## Convenções

### Routers

- Schemas inline com `const schemas = { ... } as const`
- Deixar tRPC inferir output (nunca output schema)
- Sem `async` desnecessário

### Organização

- Lógica de negócio fica em `services/`
- Routers apenas orquestram e validam input
- Helpers reutilizáveis em `lib/`

### Types

Inferir quando possível: `z.infer<typeof schema>`, Kysely types. `types.ts` só para tipos de domínio complexos.

### Naming

| Item | Padrão |
|------|--------|
| Pastas/arquivos | kebab-case |
| Procedures | resource.action |
| Types/Namespaces | PascalCase |

### Error Handling

Sem try-catch desnecessário. Prefira retornar erro tRPC claro (`TRPCError`) quando fizer sentido.

### Kysely

- `select([...])` com colunas específicas (não `selectAll()`)
- `executeTakeFirst()` para 1 item
- Transações para múltiplas tabelas

### Proibições

- output schemas, `any`, barrel exports
- `async` sem `return await`

## Database

Kysely + bun:sqlite. Arquivo: `witch.db` (ou `WITCH_DB_PATH`).

### Migrations

`src/db/migrations/NNN_descricao.ts` com `export async function up(db)`. Importar em `migrations/index.ts`. Forward-only (sem rollback).
