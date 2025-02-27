# Cardápio Digital - The House

Um elegante cardápio digital gourmet com painel administrativo para o restaurante The House.

## Funcionalidades

### Página Principal (Cardápio)
- Design gourmet com fundo preto e letras douradas
- Exibição de itens organizados por categorias:
  - Entradas
  - Pratos Principais
  - Sobremesas
  - Bebidas
- Layout responsivo para diferentes dispositivos

### Página de Administração (/adm)
- Acesso restrito via URL específica
- Adicionar novos itens ao cardápio
- Excluir itens existentes
- Gerenciamento por categorias

## Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla)
- LocalStorage (para armazenamento temporário dos dados)

## Como Usar

1. Abra o arquivo `index.html` para visualizar o cardápio
2. Para acessar o painel administrativo, navegue para `/adm/index.html`
3. No painel administrativo, você pode:
   - Adicionar novos itens preenchendo o formulário
   - Excluir itens existentes clicando no botão "Excluir"
   - Navegar entre as categorias usando as abas

## Preparação para Integração com Firebase

O projeto está preparado para futura integração com o Firebase para armazenamento de dados em nuvem. Atualmente, os dados são armazenados localmente no navegador usando LocalStorage.

## Personalização

Para personalizar o cardápio:

1. Adicione sua logo na pasta `/logo/`
2. Modifique as cores e estilos no arquivo `styles.css`
3. Ajuste os dados iniciais no arquivo `script.js`

## Notas

- Certifique-se de adicionar sua logo do restaurante na pasta `/logo/` com o nome `logo.png`
- O sistema usa armazenamento local (localStorage) para simular um banco de dados até que a integração com Firebase seja implementada
