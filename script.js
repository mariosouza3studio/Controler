// ======================================================================================
// 1. CONFIGURAÇÃO DO FIREBASE
// ======================================================================================
// COLOQUE SUAS CREDENCIAIS AQUI
const firebaseConfig = {
    apiKey: "AIzaSyA3B3fslyj9N6SIZDP56Ycf_mSGZOzWumQ",
    authDomain: "midiaindoor-project.firebaseapp.com",
    databaseURL: "https://midiaindoor-project-default-rtdb.firebaseio.com",
    projectId: "midiaindoor-project",
    storageBucket: "midiaindoor-project.firebasestorage.app",
    messagingSenderId: "231301848479",
    appId: "1:231301848479:web:4287cbf125807dae8b31aa"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();
const SLIDES_PATH = 'slides';

// Variáveis globais de estado
let currentSlides = [];     // Array principal de URLs (copia do DB)
let urlsToDelete = [];      // URLs que serão excluídas do Storage no save
let isDirty = false;        // Indica se há alterações pendentes (mover/remover)

// Elementos DOM
const gallery = document.getElementById('slides-gallery');
const statusDiv = document.getElementById('status');
const progressBarContainer = document.getElementById('uploadProgressContainer');
const progressBar = document.getElementById('uploadProgress');
const fileInput = document.getElementById('imageFiles');
const saveButton = document.getElementById('saveButton');

// ======================================================================================
// 2. FUNÇÕES DE ESTADO
// ======================================================================================

/**
 * Atualiza o estado "sujo" (alterações pendentes) e o botão Salvar.
 */
function setDirty(dirty) {
    isDirty = dirty;
    saveButton.disabled = !dirty;
    saveButton.textContent = dirty ? 'Salvar Alterações Pendentes' : 'Salvar Alterações';
    
    if (dirty) {
        statusDiv.textContent = 'Atenção: Há alterações (ordem/remoção). Clique em SALVAR!';
        statusDiv.style.color = '#ff8c00'; // Laranja
    } else {
        statusDiv.textContent = 'Slideshow pronto. Nenhuma alteração pendente.';
        statusDiv.style.color = '#333';
    }
}


// ======================================================================================
// 3. FUNÇÕES DE RENDERIZAÇÃO E GESTÃO DE LAYOUT
// ======================================================================================

/**
 * Renderiza o box de miniatura do slide.
 */
function renderSlideItem(url, index) {
    const slideBox = document.createElement('div');
    slideBox.className = 'slide-box';
    slideBox.setAttribute('data-url', url);
    slideBox.setAttribute('draggable', 'true');
    slideBox.id = `slide-${index}`;
    
    slideBox.innerHTML = `
        <img src="${url}" alt="Slide ${index + 1}">
        <div class="slide-controls">
            <span>Slide ${index + 1}</span>
            <button class="control-button btn-remove" onclick="removerSlide('${url}')">
                <i class="fas fa-trash-alt"></i> Remover
            </button>
        </div>
    `;

    slideBox.addEventListener('dragstart', handleDragStart);
    slideBox.addEventListener('dragover', handleDragOver);
    slideBox.addEventListener('dragleave', handleDragLeave);
    slideBox.addEventListener('drop', handleDrop);
    slideBox.addEventListener('dragend', handleDragEnd);

    return slideBox;
}

/**
 * Renderiza o box "Adicionar Imagem" no final da galeria.
 */
function renderAddBox() {
    const addBox = document.createElement('div');
    addBox.className = 'slide-box';
    addBox.id = 'add-slide-box';
    addBox.onclick = () => fileInput.click();

    addBox.innerHTML = `
        <i class="fas fa-plus"></i>
        <span>Adicionar Imagem</span>
    `;
    return addBox;
}

/**
 * Constrói a galeria completa (miniaturas + box Adicionar)
 */
function rebuildGallery() {
    gallery.innerHTML = '';
    
    // 1. Adiciona os slides atuais
    currentSlides.forEach((url, index) => {
        gallery.appendChild(renderSlideItem(url, index));
    });

    // 2. Adiciona o box de upload
    gallery.appendChild(renderAddBox());
}

/**
 * Carrega os slides atuais do Realtime Database.
 */
function carregarSlides() {
    statusDiv.textContent = 'Carregando slides atuais...';

    database.ref(SLIDES_PATH).once('value', (snapshot) => {
        const urls = snapshot.val() || [];
        currentSlides = urls; // Atualiza a variável global
        rebuildGallery();
        setDirty(false); // Garante que o estado inicial é limpo
        
        statusDiv.textContent = `${urls.length} slides carregados.`;
    }).catch(error => {
        statusDiv.textContent = `Erro ao carregar slides: ${error.message}`;
        statusDiv.style.color = 'red';
        console.error("Erro ao carregar slides:", error);
    });
}


// ======================================================================================
// 4. FUNÇÕES DE GERENCIAMENTO (MOVER/REMOVER)
// ======================================================================================

/**
 * Marca um slide para remoção, removendo-o de 'currentSlides' e adicionando ao 'urlsToDelete'.
 */
function removerSlide(url) {
    const index = currentSlides.indexOf(url);
    if (index === -1) return;

    // 1. Remove do array de slides atuais (mudança de ordem)
    currentSlides.splice(index, 1);
    
    // 2. Adiciona ao array para exclusão do Storage
    if (!urlsToDelete.includes(url)) {
        urlsToDelete.push(url); 
    }
    
    // 3. Atualiza o layout
    rebuildGallery();
    setDirty(true);
}

// ======================================================================================
// 5. FUNÇÕES DE DRAG & DROP (REORDENAÇÃO)
// ======================================================================================
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedItem = null;
    document.querySelectorAll('.slide-box').forEach(box => box.style.border = '3px solid transparent');
}

function handleDragOver(e) {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    
    // Ignora o box de "Adicionar Imagem" e o item que está sendo arrastado
    if (this.id === 'add-slide-box' || this === draggedItem) return;
    
    this.style.border = '3px solid #007bff'; // Feedback visual de drop
}

function handleDragLeave(e) {
    if (this.id !== 'add-slide-box') {
        this.style.border = '3px solid transparent';
    }
}

function handleDrop(e) {
    e.stopPropagation();
    this.style.border = '3px solid transparent';

    if (draggedItem && this !== draggedItem && this.id !== 'add-slide-box') {
        const fromURL = draggedItem.getAttribute('data-url');
        const toURL = this.getAttribute('data-url');

        const fromIndex = currentSlides.indexOf(fromURL);
        const toIndex = currentSlides.indexOf(toURL);

        if (fromIndex !== -1 && toIndex !== -1) {
            // Remove o item da posição original
            currentSlides.splice(fromIndex, 1);
            // Insere na nova posição
            currentSlides.splice(toIndex, 0, fromURL);

            rebuildGallery();
            setDirty(true);
        }
    }
    return false;
}


// ======================================================================================
// 6. FUNÇÕES DE FIREBASE (UPLOAD E SALVAMENTO)
// ======================================================================================

/**
 * Gerencia o evento de seleção de arquivos.
 */
fileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
        await iniciarUpload(files);
        // Limpa o input para permitir o upload dos mesmos arquivos novamente
        fileInput.value = ''; 
    }
});


/**
 * Função de upload principal
 */
async function iniciarUpload(files) {
    statusDiv.textContent = `Iniciando upload de ${files.length} arquivos...`;
    statusDiv.style.color = '#333';
    progressBarContainer.style.display = 'block';
    progressBar.style.width = '0%';

    const uploadedUrls = [];
    let totalProgress = 0;

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = `${Date.now()}_${file.name}`;
            const storageRef = storage.ref(`slides/${fileName}`);

            const uploadTask = storageRef.put(file);

            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes);
                        totalProgress = ((i + progress) / files.length) * 100;
                        progressBar.style.width = totalProgress.toFixed(0) + '%';
                        statusDiv.textContent = `Fazendo Upload... ${totalProgress.toFixed(0)}%`;
                    },
                    (error) => {
                        console.error("Erro no upload:", error);
                        reject(new Error(`Upload falhou no arquivo ${i+1}: ${error.message}`));
                    },
                    async () => {
                        const downloadURL = await storageRef.getDownloadURL();
                        uploadedUrls.push(downloadURL);
                        resolve();
                    }
                );
            });
        }

        // Adiciona as novas URLs ao final da lista de slides atual
        const allUrls = currentSlides.concat(uploadedUrls); 
        
        // Atualiza o DB e a lista local em uma única operação
        await atualizarDatabase(allUrls);
        
        statusDiv.textContent = `Sucesso! ${files.length} slides enviados e TV atualizada.`;
        statusDiv.style.color = 'green';
        progressBar.style.width = '100%';
        progressBarContainer.style.display = 'none';

        // Recarrega a lista de gerenciamento para incluir os novos slides
        carregarSlides(); 

    } catch (error) {
        console.error("Erro geral no processo de upload:", error);
        statusDiv.textContent = `Erro no processo: ${error.message}`;
        statusDiv.style.color = 'red';
        progressBarContainer.style.display = 'none';
    }
}

/**
 * Salva a lista de URLs no Realtime Database.
 */
async function atualizarDatabase(urls) {
    try {
        await database.ref(SLIDES_PATH).set(urls);
        console.log("Database atualizado com sucesso.");
    } catch (error) {
        console.error("Erro ao atualizar DB:", error);
        throw new Error('Falha ao atualizar Realtime Database.');
    }
}

/**
 * Salva as alterações (nova ordem) no Database e exclui arquivos do Storage.
 */
async function salvarAlteracoes() {
    statusDiv.textContent = 'Salvando alterações e excluindo arquivos antigos...';
    statusDiv.style.color = '#333';

    try {
        // 1. Atualiza o Realtime Database com a nova lista (currentSlides)
        await atualizarDatabase(currentSlides);

        // 2. Exclui os arquivos do Storage que foram removidos
        if (urlsToDelete.length > 0) {
            console.log(`Iniciando exclusão de ${urlsToDelete.length} arquivos do Storage.`);
            await Promise.all(urlsToDelete.map(async (url) => {
                try {
                    const fileRef = storage.refFromURL(url);
                    await fileRef.delete();
                } catch (error) {
                    console.warn(`Aviso: Falha ao excluir arquivo (pode já ter sido excluído): ${url}`, error);
                }
            }));
            urlsToDelete = []; // Limpa a lista após a exclusão
        }
        
        // Finaliza o estado
        carregarSlides(); // Recarrega para limpar o status e garantir sincronia
        setDirty(false);

        statusDiv.textContent = 'Sucesso! Slideshow e arquivos atualizados.';
        statusDiv.style.color = 'green';
        
    } catch (error) {
        statusDiv.textContent = `Erro ao salvar alterações: ${error.message}`;
        statusDiv.style.color = 'red';
    }
}


// ======================================================================================
// 7. INICIALIZAÇÃO
// ======================================================================================
document.addEventListener('DOMContentLoaded', carregarSlides);