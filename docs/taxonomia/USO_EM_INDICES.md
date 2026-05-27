# Uso da Taxonomia em Indices

A taxonomia oficial pode ser usada para medir cobertura dos dados aprovados.

No indice de padroes de locucao, ela ajuda a responder:

- quais segmentos ja possuem padroes aprovados
- quais dores ainda nao aparecem nos padroes
- quais tipos de hook estao subrepresentados

## Coverage

Coverage compara valores presentes nos itens aprovados com os IDs oficiais em `data/taxonomia/`.

Exemplo:

- `covered`: IDs ja usados por pelo menos um padrao aprovado.
- `missing`: IDs oficiais ainda sem padrao aprovado.

## Uso futuro

Essa base prepara analytics, busca semantica, clustering e recommendation engine, sem implementar essas camadas agora.
