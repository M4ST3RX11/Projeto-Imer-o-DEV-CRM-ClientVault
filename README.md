OBS: EU CRIE UM ARQUIVO DATA.JS POIS O SERVIDOR NÃO IRIA CARREGAR MEUS DADOS DO DATA.JSON PELO GIT HUB. (E MESMO ASSIM NÃO CARREGOU; E O DATA.JSON PERMANECERA NO CODIGO CASO QUEIRAM OLHAR).
PARA TESTAR O CARDS CRIE UM NOVO CARD COM AS INFOMAÇÕES QUE DESEJAR.
O ClientVault CRM é uma sofisticada aplicação web de Gerenciamento de Relacionamento com o Cliente, projetada para oferecer uma plataforma centralizada, intuitiva e visualmente moderna. O projeto se destaca por sua interface com efeito de Glassmorphism (vidro fosco), que cria uma sensação de profundidade e elegância. Esse design é alcançado através do uso estratégico de propriedades CSS, como backdrop-filter: blur() para desfocar o fundo, cores de fundo semitransparentes com rgba(), e bordas sutis que dão a impressão de que os elementos flutuam sobre a interface.

A arquitetura visual é altamente personalizável, graças ao uso extensivo de variáveis CSS. O sistema possui um tema escuro padrão e um tema claro alternativo, que podem ser trocados dinamicamente pelo usuário. Essa funcionalidade é implementada definindo um conjunto de variáveis de cores, como --primary-color, --card-bg-color e --text-color, no seletor :root para o tema padrão, e redefinindo-as dentro de um seletor de atributo [data-theme="light"] para o tema claro. A fonte 'Inter' foi escolhida para garantir legibilidade e uma aparência profissional, enquanto animações e transições suaves em hover e focus melhoram a interatividade e a experiência do usuário.

As funcionalidades principais da aplicação são robustas e integradas. O sistema permite o gerenciamento detalhado de clientes, cujas informações são armazenadas em um arquivo data.json e exibidas em "cards" com um design limpo e responsivo, organizados em um layout de grade (CSS Grid). Esses cards incluem ações rápidas como ligar, enviar e-mail e editar, com os botões se tornando clicáveis através da propriedade pointer-events: auto. A interface principal é organizada por abas, e a seção "Início" funciona como um dashboard, exibindo "mini-cards" de compromissos classificados por status (hoje, atrasado, futuro) com cores distintas para uma visualização rápida.

O projeto também inclui um sistema de calendário completo, que exibe agendamentos e notas em uma visualização mensal estilo "quadro branco". A interação do usuário, como agendamento de compromissos ou edição de clientes, ocorre em janelas modais que utilizam o mesmo efeito de vidro, mantendo o contexto visual. O feedback para ações do usuário é fornecido por meio de notificações "toast" que aparecem de forma animada na tela. A estrutura de dados em data.json é bem definida, separando claramente as informações dos clientes e as notas do calendário, garantindo que todas as partes da aplicação permaneçam conectadas e consistentes. Em suma, o ClientVault CRM combina um design estético moderno com funcionalidades de CRM essenciais, demonstrando grande atenção aos detalhes tanto na interface quanto na arquitetura de dados.

OBS: Todos os contatos presentes no site são meramente representativos e poderão ser apagados quando quizer, e substitudos por contatos verdadeiros.

Tutoriais de onde clicar:
1. Na logo do site ao clicar aparecerar informações sobre o projeto.
2. Aoclicar no card de qualque cliente tanto em agendamento quanto em clintes e no calendario, irá abrir informações do cliente, que poderá editar.
3. Você poderá adicionar novos contatos a qualque instante na aba Adicionar Clintes.
4. No Calendario Você podera adicionar observações, vizualisar clientes agendados, e colocar compromiços.
5. Nos card dos cliente há botões para escrever um e-mail ou ligar (caso seu telefone esteja vinculado ao seu dispositivo).
6. No Rodape do site tem tres links para: Alura, Discord do DEV, e O GitHub do DEV.
