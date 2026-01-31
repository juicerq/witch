# Desktop

Tauri 2 + React frontend. Janela: **840x700**, always-on-top, sem borda. Verificar com `bunx tsc --noEmit` quando mexer em types.

## Estrutura

```
src/
├── routes/            # TanStack Router (file-based)
│   ├── __root.tsx     # Root layout + providers
│   └── index.tsx      # Tela principal
├── components/ui/     # Componentes reutilizáveis
└── trpc.ts            # Cliente tRPC
```

```
src-tauri/             # Rust minimal - só spawna sidecar
├── tauri.conf.json    # Config + externalBin
└── src/lib.rs         # Spawn logic
```

## Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Tela principal (streams/filtros/login) |

## Convenções

### Gerais

- tRPC para toda comunicação (nunca Tauri invoke)
- File-based routing (nunca registrar rotas manualmente)
- Providers em `__root.tsx`
- Nomes em kebab-case: `stream-card.tsx`, `use-filters.ts`
- Um componente por arquivo, single responsibility

### UI Text

Inglês, o mais curto possível: "New" não "Click here to create a new".

### Tipografia

Usar `<Title>`, `<Text>`, `<Badge>` - nunca `<h1>`, `<p>` com classes manuais.

**Title**: `size`: xl/lg/default/sm | `variant`: default/muted

**Text** (hierarquia de opacidade):
| Variant | Opacity | Uso |
|---------|---------|-----|
| label | 35% | Section headers |
| faint | 40% | IDs, timestamps |
| muted | 50% | Secundário, placeholders |
| secondary | 60% | Conteúdo expandido |
| default | 70% | Corpo principal |
| primary | 90% | Destaque |

**Badge**: default/sky/violet/indigo/rose/emerald/amber (ver componente para cores)

### JSX

- Preferir `&&` sobre ternários: `{loading && <Spinner />}`
- Preferir `mutate` com `onSuccess`/`onError` sobre `mutateAsync` com try/catch

### Animações

Usar `motion/react` (framer-motion). Movimentos sutis (4-12px), durações curtas (150-300ms), `easeOut` entrada, `easeIn` saída. Sempre `AnimatePresence` para condicional.

### Estrutura por Rota

```
routes/index/
├── route.tsx          # Página
├── -components/       # Prefixo - evita virar rota
├── -hooks/
└── types.ts
```

Compartilhado entre rotas → `src/types/`, `src/constants/`

### Types

Sempre inferir do tRPC: `RouterInputs['x']['y']`, `RouterOutputs['x']['y']`

Nunca duplicar types do backend manualmente.

### Hooks Complexos

Hooks >150 linhas: dividir em **mini-hooks no mesmo arquivo**, separados por seções `═══`.

Cada mini-hook encapsula estado + helpers de um domínio (messages, status, modals, api). Main hook compõe e orquestra.

### Search Params

Filtros com `validateSearch` + Zod schema. Acessar via `Route.useSearch()`.

### Real-time Events

Subscription tRPC para eventos do server (se existir):

```ts
trpc.events.onInvalidate.useSubscription(undefined, {
  onData(event) {
    // event.type discrimina: "session.statusChanged" | ...
  },
});
```

Encapsular em hook dedicado (`useServerEvents`) — nunca inline no componente.

### Quando Extrair Componentes

| Situação | Ação |
|----------|------|
| JSX >50 linhas | Extrair para `-components/` |
| Usado 2+ vezes na rota | Extrair |
| Lógica própria (state, effects) | Extrair |
| Só renderiza props, <30 linhas | Pode ficar inline |
