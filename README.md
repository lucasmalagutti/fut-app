# FutMatch (fut-app)
 
Aplicativo móvel do FutMatch, construído com React Native e Expo. O app cobre os dois papéis da plataforma: jogadores, que buscam quadras e organizam partidas, e donos de quadra, que gerenciam seus espaços, horários e finanças.
 
Este repositório contém apenas o frontend. O backend correspondente (NestJS/Prisma) vive em um repositório separado, `fut-api`.
 
## Visão geral
 
O FutMatch conecta jogadores a quadras esportivas e organiza partidas coletivas com rateio automático de custo. Um jogador reserva um horário, cria uma partida pública ou privada, define o mínimo de participantes, e o sistema cobra automaticamente cada jogador quando o quórum é atingido. Donos de quadra cadastram seus espaços, definem horários de funcionamento, bloqueios e recebem pagamentos via carteira integrada.
 
## Funcionalidades principais
 
Para jogadores:
- Busca de quadras por proximidade, esporte e faixa de preço
- Criação e participação em partidas, com convite de visitantes sem cadastro
- Pagamento via cartão de crédito ou PIX, com QR code e polling automático de confirmação
- Chat direto com donos de quadra e outros jogadores
- Notificações contextuais sobre partidas, pagamentos e status de conta
- Avaliação de quadras após o uso
Para donos de quadra:
- Cadastro de quadras com múltiplos esportes, fotos, comodidades e regras
- Configuração de horários de funcionamento e bloqueios de agenda
- Painel de finanças com saldo, histórico de transações e solicitação de saque
- Cadastro de contas bancárias para recebimento
## Stack técnica
 
- React Native 0.81 com Expo SDK 54
- Expo Router (roteamento baseado em arquivos, com grupos `(auth)`, `(player)` e `(owner)`)
- TanStack Query para cache e sincronização de dados remotos
- Zustand para estado de autenticação
- React Hook Form com Zod para formulários e validação
- Axios para comunicação com a API, com interceptors de refresh de token
- Socket.IO client para chat em tempo real
## Pré-requisitos
 
- Node.js 18 ou superior
- npm
- Expo Go instalado no dispositivo físico, ou um emulador Android/iOS configurado
- Uma instância do backend `fut-api` em execução e acessível na rede
## Instalação
 
```bash
git clone <url-do-repositorio>
cd fut-app
npm install
```
 
## Configuração de ambiente
 
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
 
```
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3000
EXPO_PUBLIC_WS_URL=ws://SEU_IP_LOCAL:3000/chat
```
 
Ao testar em um dispositivo físico via Expo Go, use o IP da máquina na rede local em vez de `localhost`, já que o dispositivo não compartilha a interface de rede do computador. Sempre que o IP mudar (troca de rede Wi-Fi ou hotspot), reinicie o servidor com `npx expo start --clear` para evitar cache de variáveis de ambiente antigas.
 
## Executando o projeto
 
```bash
npm start
```
 
Isso abre o Metro Bundler. A partir daí é possível abrir o app no Expo Go escaneando o QR code, ou rodar diretamente em uma plataforma:
 
```bash
npm run android
npm run ios
npm run web
```
 
## Estrutura do projeto
 
```
app/
  (auth)/       telas de login, cadastro e recuperação de senha
  (player)/     telas do jogador: busca de quadras, reservas, partidas, carteira, chat
  (owner)/      telas do dono: quadras, finanças, chat
components/     componentes de UI reutilizáveis e componentes de domínio
services/       camada de acesso à API, um arquivo por recurso do backend
store/          estado global (Zustand), atualmente o store de autenticação
hooks/          hooks customizados (geolocalização, push notifications, autenticação)
theme/          tokens de design: cores, espaçamento, tipografia
constants/      dados estáticos, como a lista de estados e cidades do Brasil
types/          tipos TypeScript compartilhados, espelhando os modelos do backend
```
 
## Autenticação e sessão
 
O token de acesso é mantido em memória (Zustand) e, opcionalmente, persistido via `expo-secure-store` quando o usuário marca "Lembrar de mim" no login. O interceptor do Axios prioriza o token em memória e recorre ao armazenamento persistido apenas como fallback. Em caso de expiração, o token é renovado automaticamente através do endpoint de refresh, com fila de requisições pendentes durante a renovação.
 
## Pagamentos
 
O checkout suporta cartão de crédito e PIX através do Stripe, integrado pelo backend. Pagamentos via PIX exibem um QR code e fazem polling do status a cada poucos segundos até a confirmação via webhook. Cartões são debitados de forma síncrona no momento do checkout, tanto para reservas individuais quanto para cobrança automática de cota em partidas coletivas.
 
## Convenções de código
 
- Roteamento segue o padrão de arquivos do Expo Router; novas telas devem ser adicionadas dentro do grupo de rota correspondente (`(player)` ou `(owner)`)
- Chamadas à API ficam isoladas na camada `services`, nunca diretamente nos componentes de tela
- Estilos são definidos com `StyleSheet.create` ao final de cada arquivo de componente
- Formulários usam `react-hook-form` com schemas Zod para validação
