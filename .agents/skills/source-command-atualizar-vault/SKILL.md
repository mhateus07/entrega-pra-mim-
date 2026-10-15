---
name: "source-command-atualizar-vault"
description: "Sincroniza o cofre do Obsidian (segundo cérebro da Impulsio) com o estado atual deste repositório"
---

# source-command-atualizar-vault

Use this skill when the user asks to run the migrated source command `atualizar-vault`.

## Command Template

Você vai sincronizar a pasta `~/obsidian/Projetos_Dev/02 Produtos/Entrega Pra Mim/` do cofre com o **estado atual deste repositório**.

## Regras de ouro
- **Fonte da verdade = os arquivos locais deste repositório** (incluindo mudanças ainda não commitadas). O git serve só para descobrir o que mudou.
- Siga `~/obsidian/Projetos_Dev/03 Compartilhado/Como manter o cofre.md`: explique em dois níveis (na prática e no técnico), mude só o que mudou, não apague notas, não invente (`⚠️ a confirmar`) e nunca registre segredos, IPs ou dados de clientes.
- Marcador da última sincronização: `.Codex/.vault-last-sync` (commit da última vez).

## Passos
1. **Escopo do que mudou**
   - `LAST=$(cat .Codex/.vault-last-sync 2>/dev/null)`, depois `git log --oneline $LAST..HEAD`, `git diff --stat $LAST..HEAD` e `git status -s`.
   - Leia as entradas recentes de `CHANGELOG.md`: elas trazem o porquê.
   - Sem marcador: faça uma auditoria completa, comparando todas as notas da pasta com o código e os documentos.
2. **Mapeie cada mudança para as notas** (tabela "O que atualizar" em `Como manter o cofre.md`) e leia os arquivos reais envolvidos.
3. **Atualize as notas** no estilo do cofre: propriedades no topo, `[[links]]`, callouts e Mermaid onde ajudar. Foco no porquê: é material de estudo e de venda, não referência de API.
4. **Comercial e financeiro:** confira `docs/vendas/` (ou o equivalente) e reflita preços, planos e custos nas notas Comercial e Financeiro e nas propriedades do Mapa.
5. **Feche:**
   - acrescente uma entrada no topo do Devlog com a data de hoje, resumindo a sincronização;
   - atualize `atualizado:` nas notas mexidas;
   - grave o marcador: `git rev-parse HEAD > .Codex/.vault-last-sync`;
   - mostre ao Mateus a lista das notas criadas e alteradas.
