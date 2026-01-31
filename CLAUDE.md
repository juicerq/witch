# Witch

Desktop app (840x700, always-on-top) para monitorar streams da Twitch: Tauri 2 + React + Bun tRPC.

## Qualidade (sem burocracia)
- Mantenha o código limpo e previsível.
- Testes **quando mexer em lógica crítica** (auth, refresh, queries).
- Mudanças pequenas, com nomes claros e sem “magia”.

## Stack

| Layer | Tech |
|-------|------|
| Shell | Tauri 2 |
| Frontend | React 19 + TanStack Router/Query |
| Backend | Bun + tRPC + bun:sqlite (Kysely) |
| Types | tRPC end-to-end + Zod |

## Estrutura

```
apps/
├── desktop/     # Tauri + React (ver apps/desktop/CLAUDE.md)
└── server/      # Bun tRPC (ver apps/server/CLAUDE.md)
packages/
└── shared/      # Types/consts compartilhados
```

## Comandos

```bash
bun run dev            # server + desktop (concurrently)
bun run dev:server     # tRPC server
bun run dev:desktop    # Tauri dev
bun run build:server   # Compila sidecar
bun run build          # Build completo
bun run lint           # Biome
```

## Convenções Globais

- Nunca barrel imports
- tRPC para tudo (nunca Tauri invoke)
- Early returns, evitar else e nested ifs
- Planos concisos, sacrificar gramática por clareza

## TypeScript (Matt Pocock Style)

### Branded Types
IDs tipados previnem mistura acidental. Usar `Brand<T, Name>` de `lib/branded.ts` quando fizer sentido.

### Validação de Shape
`satisfies` > type assertion. Valida conformidade sem alargar tipo.

### Type Guards
Discriminated unions: usar type predicates (`e is T`) para narrowing seguro.

### Literal Preservation
`as const` em arrays/objetos para preservar tipos literais. Derivar unions: `(typeof arr)[number]`.

### Inferência
- Zod: `z.infer<typeof schema>`
- Funções: `ReturnType<typeof fn>`, `Parameters<typeof fn>`
- tRPC: `RouterInputs['x']['y']`, `RouterOutputs['x']['y']`

### Proibições
| Evitar | Usar |
|--------|------|
| `any` | `unknown` + guard |
| `as X` | `satisfies` / guard |
| `@ts-ignore` | investigar |
| `enum` | `as const` union |
| Type duplicado | Inferir da source |

## Verificação (quando fizer mudanças relevantes)

```bash
bun run lint                           # Biome (SEMPRE rodar primeiro)
cd apps/desktop && bunx tsc --noEmit   # Frontend types
# Backend tests (quando existirem)
cd apps/server && bun test
```

## Gotchas

- Pastas em `routes/` sem prefixo `-` viram rotas (TanStack Router)
- `mutateAsync` perde loading state do React Query — preferir `mutate` + callbacks
- Schemas Zod: nunca definir output schema em procedures tRPC (inferência automática)
