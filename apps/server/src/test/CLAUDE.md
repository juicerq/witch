# Tests

Testes co-localizados (`*.test.ts`). Helpers em `test/helpers.ts`.

## Naming

- Describe: unidade testada (`describe("TwitchService", () => describe("refresh", ...))`)
- Test: comportamento direto, sem "should" (`test("refreshes token", ...)`)
- Edge cases: `"<ação> when <condição>"`

## Anatomia

Arrange-Act-Assert separados por linha em branco. Act = única operação.

```ts
test("creates a record", async () => {
  const data = createItem();

  const created = await repo.create(data);

  expect(created.id).toBe(data.id);
  expect(created.created_at).toBeDefined();
});
```

## Assertions por Operação

| Op | Verificar |
|----|-----------|
| Create | Todos campos + timestamps com `toBeDefined()` |
| Read | Objeto correto ou `undefined` |
| Update | Campos alterados + inalterados permanecem |
| Delete | Retorno + `findById` retorna `undefined` |
| List | Quantidade + filtros aplicados |

## Factories

Em `test/helpers.ts`. Aceitam `overrides`, geram UUIDs, valores mínimos válidos (não "realistas").

```ts
export function createItem(overrides = {}) {
  return { id: crypto.randomUUID(), ...overrides };
}
```

## Isolamento

`beforeEach` cria DB in-memory novo. Sem estado compartilhado, sem `beforeAll` para dados, sem cleanup manual.

## NÃO Testar

- Implementação interna (spies em métodos privados)
- Código de terceiros (Zod, Kysely)
- Código trivial (getters)
- Mocks excessivos — usar DB real in-memory

## Comandos

```bash
bun test                    # Todos
bun test path/to.test.ts    # Específico
bun test --watch            # Watch
```
