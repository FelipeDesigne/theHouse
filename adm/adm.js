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
        // Para cada categoria no menuData
        for (const categoryId in menuData) {
            for (const item of menuData[categoryId]) {
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

// Função para carregar os dados do Firestore
async function loadMenuData() {
    try {
        // Carregar categorias
        const categoriesSnapshot = await db.collection('categories').get();
        if (!categoriesSnapshot.empty) {
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
            
            categoriesData = sortCategoriesByCustomOrder(categoriesData);
        } else {
            // Se não houver categorias no Firestore, verifica no localStorage
            const savedCategories = localStorage.getItem('categoriesData');
            if (savedCategories) {
                categoriesData = JSON.parse(savedCategories);
                categoriesData = sortCategoriesByCustomOrder(categoriesData);
                
                // Salva as categorias do localStorage no Firestore
                saveCategoriesData();
            }
        }

        // Inicializar menuData com arrays vazios para cada categoria
        menuData = {};
        categoriesData.forEach(category => {
            menuData[category.id] = [];
        });
        
        // Carregar itens do menu
        const menuItemsSnapshot = await db.collection('menuItems').get();
        if (!menuItemsSnapshot.empty) {
            menuItemsSnapshot.forEach(doc => {
                const item = doc.data();
                if (menuData[item.categoryId]) {
                    menuData[item.categoryId].push(item);
                }
            });
        } else {
            // Se não houver itens no Firestore, verifica no localStorage
            const savedData = localStorage.getItem('menuData');
            if (savedData) {
                const localMenuData = JSON.parse(savedData);
                
                // Copia os itens do localStorage para o menuData
                for (const categoryId in localMenuData) {
                    if (menuData[categoryId]) {
                        menuData[categoryId] = localMenuData[categoryId];
                    }
                }
                
                // Salva os itens do localStorage no Firestore
                saveMenuData();
            }
        }
        
        // Atualiza a interface
        renderCategories();
        updateCategorySelect();
        updateCategoryTabs();
        
    } catch (error) {
        console.error("Erro ao carregar dados do Firestore:", error);
        
        // Fallback para localStorage
        const savedCategories = localStorage.getItem('categoriesData');
        if (savedCategories) {
            categoriesData = JSON.parse(savedCategories);
            categoriesData = sortCategoriesByCustomOrder(categoriesData);
        }
        
        const savedData = localStorage.getItem('menuData');
        if (savedData) {
            menuData = JSON.parse(savedData);
        }
        
        // Atualiza a interface
        renderCategories();
        updateCategoryTabs();
        updateCategorySelect();
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

// Função para renderizar as categorias existentes
function renderCategories() {
    const categoriesList = document.getElementById('categorias-list');
    categoriesList.innerHTML = '';
    
    // Ordenar categorias pelo campo order
    const sortedCategories = [...categoriesData].sort((a, b) => {
        return (a.order || 0) - (b.order || 0);
    });
    
    sortedCategories.forEach((categoria, index) => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.dataset.id = categoria.id;
        
        const categoryInfo = document.createElement('div');
        categoryInfo.className = 'category-info';
        
        const categoryName = document.createElement('span');
        categoryName.textContent = categoria.nome;
        
        const categoryId = document.createElement('small');
        categoryId.textContent = `(ID: ${categoria.id})`;
        
        categoryInfo.appendChild(categoryName);
        categoryInfo.appendChild(categoryId);
        
        const categoryActions = document.createElement('div');
        categoryActions.className = 'category-actions';
        
        // Botão para mover para cima (desabilitado se for o primeiro item)
        const moveUpBtn = document.createElement('button');
        moveUpBtn.className = 'btn-move btn-move-up';
        moveUpBtn.innerHTML = '&#8593;'; // Seta para cima
        moveUpBtn.title = 'Mover para cima';
        moveUpBtn.disabled = index === 0;
        moveUpBtn.addEventListener('click', () => moveCategory(categoria.id, 'up'));
        
        // Botão para mover para baixo (desabilitado se for o último item)
        const moveDownBtn = document.createElement('button');
        moveDownBtn.className = 'btn-move btn-move-down';
        moveDownBtn.innerHTML = '&#8595;'; // Seta para baixo
        moveDownBtn.title = 'Mover para baixo';
        moveDownBtn.disabled = index === sortedCategories.length - 1;
        moveDownBtn.addEventListener('click', () => moveCategory(categoria.id, 'down'));
        
        // Botão de excluir
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Excluir categoria';
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Tem certeza que deseja excluir a categoria "${categoria.nome}"?`)) {
                deleteCategory(categoria.id);
            }
        });
        
        categoryActions.appendChild(moveUpBtn);
        categoryActions.appendChild(moveDownBtn);
        categoryActions.appendChild(deleteBtn);
        
        categoryItem.appendChild(categoryInfo);
        categoryItem.appendChild(categoryActions);
        
        categoriesList.appendChild(categoryItem);
    });
}

// Função para atualizar o select de categorias
function updateCategorySelect() {
    const categorySelect = document.getElementById('item-categoria');
    categorySelect.innerHTML = '';
    
    // As categorias já devem estar ordenadas pela função sortCategoriesByCustomOrder
    categoriesData.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria.id;
        option.textContent = categoria.nome;
        categorySelect.appendChild(option);
    });
}

// Função para atualizar as abas de categorias
function updateCategoryTabs() {
    const tabsHeader = document.querySelector('.tabs-header');
    const itemsContainer = document.querySelector('.items-container');
    
    // Limpa as abas e containers existentes
    tabsHeader.innerHTML = '';
    itemsContainer.innerHTML = '';
    
    // Cria novas abas e containers para cada categoria
    categoriesData.forEach((categoria, index) => {
        // Cria a aba
        const tabBtn = document.createElement('button');
        tabBtn.className = 'tab-btn' + (index === 0 ? ' active' : '');
        tabBtn.dataset.category = categoria.id;
        tabBtn.textContent = categoria.nome;
        tabsHeader.appendChild(tabBtn);
        
        // Cria o container de itens
        const itemsList = document.createElement('div');
        itemsList.id = `${categoria.id}-list`;
        itemsList.className = 'items-list' + (index === 0 ? ' active' : '');
        itemsContainer.appendChild(itemsList);
    });
    
    // Configura os eventos das abas
    setupTabs();
    
    // Renderiza os itens da primeira categoria (que está ativa)
    if (categoriesData.length > 0) {
        renderCategoryItems(categoriesData[0].id);
    }
}

// Função para adicionar uma nova categoria
async function addCategory(nome, id) {
    // Formata o ID para remover espaços e caracteres especiais
    id = id.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Verifica se o ID já existe
    const existingCategory = categoriesData.find(cat => cat.id === id);
    if (existingCategory) {
        alert(`Já existe uma categoria com o ID "${id}". Por favor, escolha outro ID.`);
        return false;
    }
    
    try {
        // Determina a ordem da categoria (no final da lista)
        const order = categoriesData.length;
        
        // Adiciona a nova categoria
        const newCategory = { id, nome, order };
        categoriesData.push(newCategory);
        
        // Inicializa o array para a nova categoria
        menuData[id] = [];
        
        // Salva as alterações
        await saveCategoriesData();
        await saveMenuData();
        
        // Atualiza a interface
        renderCategories();
        updateCategoryTabs();
        updateCategorySelect();
        
        return true;
    } catch (error) {
        console.error("Erro ao adicionar categoria:", error);
        alert("Ocorreu um erro ao adicionar a categoria. Por favor, tente novamente.");
        return false;
    }
}

// Função para excluir uma categoria
async function deleteCategory(categoryId) {
    try {
        // Verifica se a categoria contém itens
        if (menuData[categoryId] && menuData[categoryId].length > 0) {
            alert(`Não é possível excluir a categoria "${categoriesData.find(cat => cat.id === categoryId).nome}" pois ela contém itens. Remova todos os itens primeiro.`);
            return;
        }
        
        // Remove a categoria do Firebase
        await db.collection('categories').doc(categoryId).delete();
        
        // Remove a categoria do array local
        categoriesData = categoriesData.filter(cat => cat.id !== categoryId);
        
        // Remove a categoria do menuData
        delete menuData[categoryId];
        
        // Atualiza a ordem das categorias restantes
        categoriesData.forEach((cat, index) => {
            cat.order = index;
        });
        
        // Salva as alterações
        await saveCategoriesData();
        await saveMenuData();
        
        // Atualiza a interface
        renderCategories();
        updateCategoryTabs();
        updateCategorySelect();
    } catch (error) {
        console.error("Erro ao excluir categoria:", error);
        alert("Ocorreu um erro ao excluir a categoria. Por favor, tente novamente.");
    }
}

// Função para renderizar os itens de uma categoria específica
function renderCategoryItems(category) {
    const itemsList = document.getElementById(`${category}-list`);
    if (!itemsList) return;
    
    itemsList.innerHTML = '';
    
    // Verifica se a categoria existe no menuData
    if (!menuData[category] || menuData[category].length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'empty-category';
        emptyMessage.textContent = 'Nenhum item disponível nesta categoria.';
        itemsList.appendChild(emptyMessage);
        return;
    }
    
    // Renderiza cada item da categoria
    menuData[category].forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'menu-item';
        itemElement.dataset.id = item.id;
        
        const itemHeader = document.createElement('div');
        itemHeader.className = 'item-header';
        
        const itemTitle = document.createElement('h3');
        itemTitle.textContent = item.nome;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'item-actions';
        
        // Botão de editar
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.innerHTML = '&#9998;'; // Ícone de lápis
        editBtn.title = 'Editar item';
        
        // Adiciona evento de clique para editar o item
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditItemModal(category, item);
        });
        
        // Botão de excluir
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Excluir item';
        
        // Adiciona evento de clique para excluir o item
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Confirma a exclusão
            if (confirm(`Tem certeza que deseja excluir o item "${item.nome}"?`)) {
                deleteMenuItem(category, item.id);
            }
        });
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        
        itemHeader.appendChild(itemTitle);
        itemHeader.appendChild(actionsDiv);
        
        itemElement.appendChild(itemHeader);
        
        // Adiciona a descrição apenas se existir
        if (item.descricao && item.descricao.trim() !== '') {
            const itemDescription = document.createElement('p');
            itemDescription.className = 'description';
            itemDescription.textContent = item.descricao;
            itemElement.appendChild(itemDescription);
        }
        
        // Adiciona o preço apenas se existir
        if (item.preco && item.preco.trim() !== '') {
            const itemPrice = document.createElement('p');
            itemPrice.className = 'price';
            itemPrice.textContent = item.preco;
            itemElement.appendChild(itemPrice);
        }
        
        itemsList.appendChild(itemElement);
    });
}

// Função para renderizar todos os itens do cardápio
function renderAllItems() {
    categoriesData.forEach(categoria => {
        renderCategoryItems(categoria.id);
    });
}

// Função para gerar um ID único para um item
function generateId(category) {
    // Gera um ID baseado na categoria e em um timestamp
    const timestamp = new Date().getTime();
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${category}_${timestamp}_${randomStr}`;
}

// Função para adicionar um novo item ao cardápio
async function addMenuItem(category, nome, descricao, preco) {
    // Gera um ID único para o item
    const id = generateId(category);
    
    // Cria o novo item
    const newItem = { id, nome, descricao, preco };
    
    // Adiciona o item à categoria
    menuData[category].push(newItem);
    
    // Salva os dados
    try {
        // Adiciona ao Firestore
        await db.collection('menuItems').doc(id).set({
            id,
            nome,
            descricao,
            preco,
            categoryId: category
        });
        
        // Também salva no localStorage como backup
        saveMenuData();
        
        // Renderiza os itens da categoria
        renderCategoryItems(category);
        
        // Limpa os campos do formulário
        document.getElementById('item-nome').value = '';
        document.getElementById('item-descricao').value = '';
        document.getElementById('item-preco').value = '';
        
        // Feedback visual
        alert('Item adicionado com sucesso!');
        
        return true;
    } catch (error) {
        console.error("Erro ao adicionar item:", error);
        
        // Salva no localStorage como fallback
        saveMenuData();
        
        // Renderiza os itens da categoria
        renderCategoryItems(category);
        
        return false;
    }
}

// Função para excluir um item do cardápio
async function deleteMenuItem(category, itemId) {
    try {
        // Remove do Firestore
        await db.collection('menuItems').doc(itemId).delete();
        
        // Remove do array local
        menuData[category] = menuData[category].filter(item => item.id !== itemId);
        
        // Salva os dados
        saveMenuData();
        
        // Renderiza os itens da categoria
        renderCategoryItems(category);
        
        return true;
    } catch (error) {
        console.error("Erro ao excluir item:", error);
        
        // Remove do array local
        menuData[category] = menuData[category].filter(item => item.id !== itemId);
        
        // Salva os dados no localStorage como fallback
        localStorage.setItem('menuData', JSON.stringify(menuData));
        
        // Renderiza os itens da categoria
        renderCategoryItems(category);
        
        return false;
    }
}

// Função para alternar entre as abas de categorias
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const itemsLists = document.querySelectorAll('.items-list');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove a classe active de todas as abas
            tabBtns.forEach(b => b.classList.remove('active'));
            
            // Adiciona a classe active na aba clicada
            btn.classList.add('active');
            
            // Obtém a categoria da aba clicada
            const category = btn.dataset.category;
            
            // Esconde todas as listas de itens
            itemsLists.forEach(list => list.classList.remove('active'));
            
            // Mostra apenas a lista de itens da categoria selecionada
            const selectedList = document.getElementById(`${category}-list`);
            if (selectedList) {
                selectedList.classList.add('active');
            }
            
            // Renderiza os itens da categoria selecionada
            renderCategoryItems(category);
        });
    });
}

// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Carrega os dados do Firestore
        await loadMenuData();
        
        // Força a atualização da ordem das categorias
        await updateCategoriesOrder();
        
        // Atualiza a interface
        updateCategoryTabs();
        updateCategorySelect();
        renderCategories();
        
        // Configura o formulário para adicionar categorias
        const categoriaForm = document.getElementById('categoria-form');
        
        categoriaForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nomeInput = document.getElementById('categoria-nome');
            const idInput = document.getElementById('categoria-id');
            
            const nome = nomeInput.value.trim();
            const id = idInput.value.trim();
            
            if (nome && id) {
                // Formata o ID para remover espaços e caracteres especiais
                const formattedId = id.replace(/[^a-zA-Z0-9_]/g, '_');
                
                // Verifica se o ID já existe
                const existingCategory = categoriesData.find(cat => cat.id === formattedId);
                if (existingCategory) {
                    alert(`Já existe uma categoria com o ID "${formattedId}". Por favor, escolha outro ID.`);
                    return;
                }
                
                // Determina a ordem da categoria (no final da lista)
                const order = categoriesData.length;
                
                // Adiciona a nova categoria
                const newCategory = { id: formattedId, nome, order };
                categoriesData.push(newCategory);
                
                // Inicializa o array para a nova categoria
                menuData[formattedId] = [];
                
                // Salva as alterações
                saveCategoriesData();
                saveMenuData();
                
                // Atualiza a interface
                renderCategories();
                updateCategoryTabs();
                updateCategorySelect();
                
                // Limpa os campos do formulário
                nomeInput.value = '';
                idInput.value = '';
                
                // Feedback visual
                alert('Categoria adicionada com sucesso!');
            } else {
                alert('Nome e ID da categoria são obrigatórios.');
            }
        });
        
        // Configura o botão de atualização da ordem das categorias
        const updateOrderBtn = document.getElementById('update-order-btn');
        updateOrderBtn.addEventListener('click', async () => {
            try {
                // Desabilita o botão durante a atualização
                updateOrderBtn.disabled = true;
                updateOrderBtn.textContent = 'Atualizando...';
                
                // Força a atualização da ordem das categorias
                await updateCategoriesOrder();
                
                // Atualiza a interface
                updateCategoryTabs();
                updateCategorySelect();
                renderCategories();
                
                // Feedback visual
                updateOrderBtn.textContent = 'Ordem Atualizada!';
                setTimeout(() => {
                    updateOrderBtn.disabled = false;
                    updateOrderBtn.textContent = 'Atualizar Ordem das Categorias';
                }, 2000);
            } catch (error) {
                console.error("Erro ao atualizar a ordem das categorias:", error);
                updateOrderBtn.textContent = 'Erro ao Atualizar';
                setTimeout(() => {
                    updateOrderBtn.disabled = false;
                    updateOrderBtn.textContent = 'Atualizar Ordem das Categorias';
                }, 2000);
            }
        });
        
        // Configura o formulário para adicionar itens
        const itemForm = document.getElementById('item-form');
        itemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const categoriaSelect = document.getElementById('item-categoria');
            const nomeInput = document.getElementById('item-nome');
            const descricaoInput = document.getElementById('item-descricao');
            const precoInput = document.getElementById('item-preco');
            
            const categoria = categoriaSelect.value;
            const nome = nomeInput.value.trim();
            const descricao = descricaoInput.value.trim();
            const preco = precoInput.value.trim();
            
            if (categoria && nome) {
                // Gera um ID único para o item
                const id = generateId(categoria);
                
                // Cria o novo item
                const newItem = { id, nome, descricao, preco };
                
                // Adiciona o item à categoria
                menuData[categoria].push(newItem);
                
                // Salva os dados
                try {
                    // Adiciona ao Firestore
                    db.collection('menuItems').doc(id).set({
                        id,
                        nome,
                        descricao,
                        preco,
                        categoryId: categoria
                    });
                    
                    // Também salva no localStorage como backup
                    saveMenuData();
                    
                    // Renderiza os itens da categoria
                    renderCategoryItems(categoria);
                    
                    // Limpa os campos do formulário
                    nomeInput.value = '';
                    descricaoInput.value = '';
                    precoInput.value = '';
                    
                    // Feedback visual
                    alert('Item adicionado com sucesso!');
                } catch (error) {
                    console.error("Erro ao adicionar item:", error);
                    alert("Ocorreu um erro ao adicionar o item. Por favor, tente novamente.");
                }
            } else {
                // Se o nome ou categoria estiver faltando
                alert('Nome do item e categoria são obrigatórios.');
            }
        });
    } catch (error) {
        console.error("Erro ao inicializar a aplicação:", error);
    }
});

// Função para mover uma categoria para cima ou para baixo
async function moveCategory(categoryId, direction) {
    try {
        // Encontra a categoria no array
        const categoryIndex = categoriesData.findIndex(cat => cat.id === categoryId);
        
        if (categoryIndex !== -1) {
            // Move a categoria para cima
            if (direction === 'up' && categoryIndex > 0) {
                // Troca a categoria com a anterior
                const temp = categoriesData[categoryIndex];
                categoriesData[categoryIndex] = categoriesData[categoryIndex - 1];
                categoriesData[categoryIndex - 1] = temp;
            }
            // Move a categoria para baixo
            else if (direction === 'down' && categoryIndex < categoriesData.length - 1) {
                // Troca a categoria com a próxima
                const temp = categoriesData[categoryIndex];
                categoriesData[categoryIndex] = categoriesData[categoryIndex + 1];
                categoriesData[categoryIndex + 1] = temp;
            }
            
            // Atualiza a ordem das categorias
            categoriesData.forEach((cat, index) => {
                cat.order = index;
            });
            
            // Atualiza a interface ANTES de salvar no Firebase
            // Isso faz com que a interface seja atualizada imediatamente
            renderCategories();
            updateCategoryTabs();
            updateCategorySelect();
            
            // Adiciona uma animação para mostrar que algo aconteceu
            const categoryItems = document.querySelectorAll('.category-item');
            categoryItems.forEach(item => {
                item.classList.add('category-moved');
                setTimeout(() => {
                    item.classList.remove('category-moved');
                }, 500);
            });
            
            // Salva as alterações no Firebase em segundo plano
            saveCategoriesData().catch(error => {
                console.error("Erro ao salvar a ordem das categorias:", error);
                alert("Ocorreu um erro ao salvar a ordem das categorias. A página será recarregada.");
                location.reload();
            });
        }
    } catch (error) {
        console.error("Erro ao mover categoria:", error);
        alert("Ocorreu um erro ao mover a categoria. Por favor, tente novamente.");
    }
}

// Função para abrir o modal de edição de item
function openEditItemModal(category, item) {
    // Abre o modal de edição
    const modal = document.getElementById('edit-item-modal');
    modal.classList.add('active');
    
    // Preenche os campos do formulário com os dados do item
    const nomeInput = document.getElementById('edit-item-nome');
    const descricaoInput = document.getElementById('edit-item-descricao');
    const precoInput = document.getElementById('edit-item-preco');
    
    nomeInput.value = item.nome || '';
    descricaoInput.value = item.descricao || '';
    precoInput.value = item.preco || '';
    
    // Remove event listeners antigos para evitar duplicação
    const saveBtn = document.getElementById('edit-item-save');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    
    // Configura o botão de salvar
    newSaveBtn.addEventListener('click', async () => {
        // Pega os dados do formulário
        const nome = nomeInput.value.trim();
        const descricao = descricaoInput.value.trim();
        const preco = precoInput.value.trim();
        
        if (!nome) {
            alert('O nome do item é obrigatório.');
            return;
        }
        
        // Atualiza o item
        try {
            // Primeiro, fecha o modal para dar feedback visual imediato
            modal.classList.remove('active');
            
            // Cria um objeto com os dados atualizados
            const updatedItem = {
                ...item,
                nome,
                descricao,
                preco
            };
            
            // Atualiza no Firestore
            await db.collection('menuItems').doc(item.id).update(updatedItem);
            
            // Atualiza o menuData
            const itemIndex = menuData[category].findIndex(i => i.id === item.id);
            if (itemIndex !== -1) {
                menuData[category][itemIndex] = updatedItem;
            }
            
            // Salva as alterações
            await saveMenuData();
            
            // Renderiza os itens da categoria
            renderCategoryItems(category);
            
        } catch (error) {
            console.error("Erro ao atualizar item:", error);
            alert("Ocorreu um erro ao atualizar o item. Por favor, tente novamente.");
        }
    });
    
    // Configura o botão de fechar
    const closeBtn = document.querySelector('.close-modal');
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    
    newCloseBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    // Configura o botão de cancelar
    const cancelBtn = document.querySelector('.modal-actions .btn-secondary');
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    newCancelBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
}
