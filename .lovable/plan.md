

# Compatibilizar Canais de Aquisicao Existentes

## Problema

As negociacoes existentes armazenam o canal como texto (ex: "Cliente fidelizado", "Indicacao"). A tabela `acquisition_channels` criada tem duas incompatibilidades:

1. **Typo**: "Cliende fidelizado" na tabela (falta o "t") vs "Cliente fidelizado" nas negociacoes
2. **Canal ausente**: "Indicacao" existe em negociacoes mas nao foi criado na tabela de canais

Dados atuais nas negociacoes: Google, Facebook, Instagram, Indicacao, Autorizado, Cliente fidelizado
Dados na tabela de canais: Google, Tiktok, Facebook, Whatsapp, LinkedIn, Youtube, Instagram, E-mail, **Cliende** fidelizado, Autorizado

## Solucao

Duas operacoes de dados (sem alteracao de schema):

1. **Corrigir o typo**: UPDATE `acquisition_channels` SET name = 'Cliente fidelizado' WHERE name = 'Cliende fidelizado'
2. **Adicionar canal faltante**: INSERT "Indicacao" com icone `megaphone` na tabela `acquisition_channels`

Nenhuma alteracao de codigo necessaria — o sistema ja faz match por nome do canal.

