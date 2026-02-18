

# Corrigir destaque ativo da navegacao mobile entre secoes

## Problema

O `useActiveSection` usa `intersectionRatio` para determinar qual secao esta ativa. Porem, as secoes `marmitas-fit` e `marmitas-fitness` sao muito altas (contém carrosséis completos), fazendo com que o `intersectionRatio` seja sempre muito baixo e quase igual para ambas. Isso impede que o destaque mude corretamente ao rolar entre elas.

## Solucao

Reescrever a logica do `useActiveSection` para usar **posicao do topo do elemento** em vez de `intersectionRatio`. A secao ativa sera aquela cujo topo esta mais proximo (mas acima) da linha de offset no viewport. Isso funciona de forma confiavel independente do tamanho da secao.

## Detalhes tecnicos

### Arquivo: `src/hooks/useActiveSection.ts`

Substituir a abordagem de `IntersectionObserver` + `intersectionRatio` por um listener de scroll que:

1. A cada evento de scroll, percorre todos os `sectionIds`
2. Para cada um, pega `getBoundingClientRect().top`
3. A secao ativa e aquela cujo topo ja passou da linha de offset (top <= offset) e esta mais perto dela (maior top entre os que passaram)
4. Usa `requestAnimationFrame` para evitar jank
5. Mantém a mesma interface publica (`sectionIds`, `offset`, retorna `string | null`)

Nova logica (simplificada):

```
useEffect(() => {
  const handleScroll = () => {
    let activeId: string | null = null;
    let closestDistance = -Infinity;

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const top = el.getBoundingClientRect().top - offset;
      // Section passed the offset line and is closest to it
      if (top <= 0 && top > closestDistance) {
        closestDistance = top;
        activeId = id;
      }
    });

    setActiveSection(activeId);
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll(); // initial check
  return () => window.removeEventListener("scroll", handleScroll);
}, [sectionIds, offset]);
```

### Arquivos afetados

- `src/hooks/useActiveSection.ts` (unico arquivo)

### Por que isso resolve

- Secoes grandes ou pequenas funcionam igualmente, pois a logica depende apenas da posicao do topo
- Ao rolar de `marmitas-fit` para `marmitas-fitness`, o topo de `marmitas-fitness` cruza a linha de offset e imediatamente assume o destaque
- Sem dependencia de `IntersectionObserver` thresholds que nao funcionam bem para elementos muito altos
