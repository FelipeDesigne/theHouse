// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDjYsMvVfFYyjb_y8zam3jEqHEny9BBX0Y",
  authDomain: "cardapiothehouse-10bf5.firebaseapp.com",
  projectId: "cardapiothehouse-10bf5",
  storageBucket: "cardapiothehouse-10bf5.firebasestorage.app",
  messagingSenderId: "219168338609",
  appId: "1:219168338609:web:184dbd24de80c72c3de890",
  measurementId: "G-T4BGTKKC9N"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Dados do cardápio
let menuData = {};

// Dados das categorias
let categoriesData = [];

// Ordem personalizada das categorias
const categoryOrder = [
    "Cervejas Latas",
    "Cervejas Long Neck",
    "Cervejas Garrafas",
    "Chopp",
    "Drinks",
    "Drinks Sem Álcool",
    "Doses",
    "Bebidas Não Alcoólicas",
    "Refrigerantes",
    "Energéticos",
    "Sucos",
    "Porções",
    "Tábuas",
    "Lanches Artesanais",
    "Adicionais",
    "Pizzas Tradicionais",
    "Pizzas Gourmet",
    "Pizzas Doces",
    "Massas",
    "Sobremesas"
];

// Função para ordenar as categorias conforme a ordem personalizada
function sortCategoriesByCustomOrder(categories) {
    return categories.sort((a, b) => {
        // Se ambas as categorias tiverem um campo order definido, usa esse campo
        if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
        }
        
        const indexA = categoryOrder.indexOf(a.nome);
        const indexB = categoryOrder.indexOf(b.nome);
        
        // Se ambas as categorias estiverem na lista de ordem
        if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
        }
        
        // Se apenas a categoria A estiver na lista de ordem
        if (indexA !== -1) {
            return -1;
        }
        
        // Se apenas a categoria B estiver na lista de ordem
        if (indexB !== -1) {
            return 1;
        }
        
        // Se nenhuma das categorias estiver na lista, mantém a ordem original
        return 0;
    });
}

// Função para salvar os dados no Firestore
async function saveMenuData() {
    try {
        for (const categoryId in menuData) {
            const items = menuData[categoryId];
            for (const item of items) {
                await db.collection('menuItems').doc(item.id).set({
                    id: item.id,
                    nome: item.nome,
                    descricao: item.descricao,
                    preco: item.preco,
                    categoryId: categoryId
                });
            }
        }
        
        // Também salva no localStorage como backup
        localStorage.setItem('menuData', JSON.stringify(menuData));
    } catch (error) {
        console.error("Erro ao salvar dados no Firestore:", error);
        // Salva no localStorage como fallback
        localStorage.setItem('menuData', JSON.stringify(menuData));
    }
}

// Função para salvar as categorias no Firestore
async function saveCategoriesData() {
    try {
        for (const category of categoriesData) {
            await db.collection('categories').doc(category.id).set(category);
        }
        
        // Também salva no localStorage como backup
        localStorage.setItem('categoriesData', JSON.stringify(categoriesData));
    } catch (error) {
        console.error("Erro ao salvar categorias no Firestore:", error);
        // Salva no localStorage como fallback
        localStorage.setItem('categoriesData', JSON.stringify(categoriesData));
    }
}

// Função para forçar a atualização da ordem das categorias
async function updateCategoriesOrder() {
    let updated = false;
    
    // Verificar cada categoria e atualizar sua ordem conforme a lista predefinida
    categoriesData.forEach(category => {
        const index = categoryOrder.indexOf(category.nome);
        if (index !== -1) {
            // Se a categoria estiver na lista, atualiza a ordem
            if (category.order !== index) {
                category.order = index;
                updated = true;
            }
        } else if (category.order === undefined) {
            // Se a categoria não estiver na lista e não tiver ordem definida, coloca no final
            category.order = categoryOrder.length;
            updated = true;
        }
    });
    
    // Se alguma categoria foi atualizada, salva as alterações
    if (updated) {
        await saveCategoriesData();
        // Reordena as categorias
        categoriesData = sortCategoriesByCustomOrder(categoriesData);
    }
}

// Função para carregar os dados do Firestore
async function loadMenuData() {
    try {
        // Carregar categorias
        const categoriesSnapshot = await db.collection('categories').get();
        categoriesData = [];
        categoriesSnapshot.forEach(doc => {
            categoriesData.push(doc.data());
        });
        
        // Verificar se as categorias têm o campo order e atualizá-las se necessário
        let needsUpdate = false;
        categoriesData.forEach(category => {
            if (category.order === undefined) {
                const index = categoryOrder.indexOf(category.nome);
                category.order = index !== -1 ? index : categoryOrder.length;
                needsUpdate = true;
            }
        });
        
        // Se alguma categoria foi atualizada, salvar as alterações
        if (needsUpdate) {
            await saveCategoriesData();
        }
        
        // Ordenar as categorias conforme a ordem personalizada
        categoriesData = sortCategoriesByCustomOrder(categoriesData);

        // Carregar itens do menu
        menuData = {};
        
        // Inicializar arrays vazios para cada categoria
        categoriesData.forEach(category => {
            menuData[category.id] = [];
        });
        
        // Preencher com os itens
        const menuItemsSnapshot = await db.collection('menuItems').get();
        menuItemsSnapshot.forEach(doc => {
            const item = doc.data();
            if (menuData[item.categoryId]) {
                menuData[item.categoryId].push(item);
            }
        });

        // Renderizar o menu após carregar os dados
        renderMenuItems();
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        
        // Se houver erro, tentar carregar do localStorage como fallback
        const savedData = localStorage.getItem('menuData');
        if (savedData) {
            menuData = JSON.parse(savedData);
        } else {
            menuData = {};
        }
        
        const savedCategories = localStorage.getItem('categoriesData');
        if (savedCategories) {
            categoriesData = JSON.parse(savedCategories);
        } else {
            // Categorias padrão caso não haja dados
            categoriesData = [
                { id: 'entradas', nome: 'Entradas' },
                { id: 'pratosPrincipais', nome: 'Pratos Principais' },
                { id: 'sobremesas', nome: 'Sobremesas' },
                { id: 'bebidas', nome: 'Bebidas' }
            ];
        }
        
        // Renderizar o menu após carregar os dados de fallback
        renderMenuItems();
    }
}

// Função para criar as seções de categorias
function createCategorySections() {
    const main = document.querySelector('main');
    main.innerHTML = '';
    
    // Ordena as categorias conforme a ordem personalizada
    const sortedCategories = [...categoriesData].sort((a, b) => {
        const indexA = categoryOrder.indexOf(a.nome);
        const indexB = categoryOrder.indexOf(b.nome);
        
        // Se ambas as categorias estão na ordem personalizada
        if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
        }
        
        // Se apenas uma categoria está na ordem personalizada
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        
        // Se nenhuma categoria está na ordem personalizada, usa a ordem definida no campo order
        return a.order - b.order;
    });
    
    // Para cada categoria
    sortedCategories.forEach(category => {
        // Cria a seção da categoria
        const section = document.createElement('section');
        section.className = 'category';
        section.id = `category-${category.id}`; // Adiciona ID para navegação
        
        // Adiciona o título da categoria
        const title = document.createElement('h2');
        title.textContent = category.nome;
        section.appendChild(title);
        
        // Cria a lista de itens
        const itemList = document.createElement('div');
        itemList.className = 'item-list';
        section.appendChild(itemList);
        
        // Adiciona a seção ao main
        main.appendChild(section);
    });
}

// Função para renderizar os itens do cardápio
function renderMenuItems() {
    // Primeiro, cria as seções de categorias
    createCategorySections();
    
    // Depois, renderiza os itens em cada categoria
    categoriesData.forEach(categoria => {
        const categoryId = categoria.id;
        const itemsContainer = document.querySelector(`#category-${categoryId} .item-list`);
        
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
            
            // Verifica se a categoria tem itens
            if (menuData[categoryId] && menuData[categoryId].length > 0) {
                // Adiciona cada item à categoria
                menuData[categoryId].forEach(item => {
                    const menuItem = createMenuItem(item);
                    itemsContainer.appendChild(menuItem);
                });
            } else {
                // Se não houver itens, exibe uma mensagem
                const noItems = document.createElement('p');
                noItems.className = 'no-items';
                noItems.textContent = 'Nenhum item disponível nesta categoria.';
                itemsContainer.appendChild(noItems);
            }
        }
    });
    
    // Cria a navegação rápida
    createQuickNav();
}

// Função para criar um elemento de item do cardápio
function createMenuItem(item) {
    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item';
    menuItem.dataset.id = item.id;

    const title = document.createElement('h3');
    title.textContent = item.nome;
    menuItem.appendChild(title);

    // Adiciona a descrição apenas se existir
    if (item.descricao && item.descricao.trim() !== '') {
        const description = document.createElement('p');
        description.className = 'description';
        description.textContent = item.descricao;
        menuItem.appendChild(description);
    }

    // Adiciona o preço apenas se existir
    if (item.preco && item.preco.trim() !== '') {
        const price = document.createElement('p');
        price.className = 'price';
        price.textContent = item.preco;
        menuItem.appendChild(price);
    }

    return menuItem;
}

// Função para criar a navegação rápida
function createQuickNav() {
    const quickNavContainer = document.getElementById('quick-nav-items');
    quickNavContainer.innerHTML = '';
    
    // Para cada categoria no menuData
    Object.keys(menuData).forEach(categoryId => {
        // Verifica se a categoria tem itens
        if (menuData[categoryId] && menuData[categoryId].length > 0) {
            // Encontra o nome da categoria
            const category = categoriesData.find(cat => cat.id === categoryId);
            if (category) {
                // Cria um item de navegação rápida
                const navItem = document.createElement('div');
                navItem.className = 'quick-nav-item';
                navItem.textContent = category.nome;
                
                // Adiciona evento de clique para rolar até a categoria
                navItem.addEventListener('click', () => {
                    const categoryElement = document.getElementById(`category-${categoryId}`);
                    if (categoryElement) {
                        categoryElement.scrollIntoView({ behavior: 'smooth' });
                    }
                });
                
                // Adiciona o item ao container
                quickNavContainer.appendChild(navItem);
            }
        }
    });
}

// Botão de voltar ao topo
window.onscroll = function() {scrollFunction()};

function scrollFunction() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    document.getElementById('backToTopBtn').style.display = 'block';
  } else {
    document.getElementById('backToTopBtn').style.display = 'none';
  }
}

document.getElementById('backToTopBtn').addEventListener('click', function() {
  document.body.scrollTop = 0; // Para Safari
  document.documentElement.scrollTop = 0; // Para Chrome, Firefox, IE e Opera
});

// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Carrega os dados do cardápio
        await loadMenuData();
        
        // Força a atualização da ordem das categorias
        await updateCategoriesOrder();
        
        // Cria as seções de categorias
        createCategorySections();
        
        // Renderiza os itens do cardápio
        renderMenuItems();
        
        // Cria a navegação rápida
        createQuickNav();
        
        // Configura a pesquisa
        setupSearch();
    } catch (error) {
        console.error("Erro ao inicializar a aplicação:", error);
    }
});
