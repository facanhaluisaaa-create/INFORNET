# Simulador de atendimento Infornet

Site para a etapa prática do treinamento comercial. O atendente coloca o nome, atende 4 clientes simulados pelo WhatsApp (um de cada perfil, com temperamentos sorteados) e recebe uma avaliação. Cada avaliação fica salva e aparece para o instrutor em `/resultados.html`.

## Como funciona

| Parte | Arquivo |
|---|---|
| Página do atendente | `index.html`, `app.js`, `styles.css` |
| Área do instrutor (resultados, filtro por nome, planilha CSV) | `resultados.html` |
| Clientes, temperamentos e regras da Infornet | `lib/dados.js` |
| Textos enviados ao Claude (cliente e avaliação) | `lib/prompts.js` |
| Chamadas à API do Claude | `lib/claude.js` |
| Onde os resultados ficam salvos | `lib/armazenamento.js` |
| Rotas do servidor | `api/config.js`, `api/cliente.js`, `api/avaliar.js`, `api/resultados.js` |

Os detalhes escondidos de cada cliente ficam só no servidor: o atendente não consegue vê-los pelo navegador.

## Publicar na Vercel (uma vez só)

1. Crie uma conta em vercel.com entrando com o GitHub.
2. Clique em **Add New → Project** e importe o repositório `INFORNET`.
3. Em **Root Directory**, escolha a pasta `simulador`. Framework: **Other**. Não precisa mudar mais nada.
4. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `ANTHROPIC_API_KEY` | A chave da API do Claude (console.anthropic.com → API Keys) |
   | `CODIGO_TURMA` | Um código simples que os atendentes digitam, por exemplo `INFORNET2026` |
   | `SENHA_INSTRUTOR` | A senha para ver os resultados |

5. Clique em **Deploy**. Em cerca de 1 minuto sai o link do site.
6. Banco de dados para guardar os resultados: no projeto, abra **Storage → Create Database → Upstash Redis** (plano gratuito) e conecte ao projeto. Depois clique em **Deployments → ⋯ → Redeploy** para o site passar a usar o banco.

Sem o passo 6, o site funciona, mas os resultados ficam só na memória do servidor e somem quando ele reinicia. A área do instrutor avisa quando o banco não está ligado.

## Atualizar

Cada alteração enviada para a branch que a Vercel acompanha publica uma nova versão sozinha. Para mudar clientes, temperamentos ou regras, edite `lib/dados.js`.

## Testar no computador

```bash
cd simulador
npm install
ANTHROPIC_API_KEY=sua-chave CODIGO_TURMA=teste SENHA_INSTRUTOR=teste node dev-server.js
```

Abra http://localhost:3000.

## Custo

Cada mensagem do atendente e cada avaliação é uma chamada à API do Claude, cobrada na conta dona da chave. O cliente simulado usa esforço baixo (respostas curtas) e a avaliação usa esforço médio. Acompanhe o gasto em console.anthropic.com → Usage e, se quiser, defina um limite mensal em Limits.
