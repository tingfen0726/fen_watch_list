// 1. Supabase 連線設定
const SUPABASE_URL = 'https://vknwrklswtfvnvxbblcs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4nJ42UKB6VwiYwNmPkb3Gw_z6AWLM1-';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// 全域變數
let allData = [];
let currentFilters = { keyword: '', sort: 'default', year: 'all', status: 'all', country: 'all' };
let currentUser = null; // 記錄登入狀態

// --- 2. 抓取資料 ---
async function fetchData() {
    const { data, error } = await db
        .from('drama_list')
        .select('*')
        .order('id', { ascending: false }); // 新加入的劇排在前面

    if (error) {
        console.error('讀取失敗:', error);
        return;
    }

    allData = data;

    // 產生年份選項
    const yearSelect = document.getElementById('year-select');
    const allYears = data.map(item => item.year).filter(y => y);
    const uniqueYears = [...new Set(allYears)].sort((a, b) => b - a);
    
    yearSelect.innerHTML = '<option value="all">年份</option>'; 
    uniqueYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    applyFilters(); // 渲染卡片
}

// 執行初始抓取
fetchData();

// --- 3. 監聽登入狀態 ---
db.auth.onAuthStateChange((event, session) => {
    const loginBtn = document.getElementById('login-btn');
    const addBtn = document.getElementById('add-btn'); // ✨ 抓取新增按鈕

    if (session) {
        currentUser = session.user;
        if(loginBtn) {
            loginBtn.innerText = '登出';
            loginBtn.style.background = '#555';
        }
        // ✨ 登入後：顯示新增按鈕
        if(addBtn) addBtn.style.display = 'flex';
    } else {
        currentUser = null;
        if(loginBtn) {
            loginBtn.innerText = '登入';
            loginBtn.style.background = '#2F2F2F';
        }
        // ✨ 登出後：隱藏新增按鈕
        if(addBtn) addBtn.style.display = 'none';
    }
});

// --- 4. 登入/登出功能 ---
async function toggleLogin() {
    if (currentUser) {
        await db.auth.signOut();
        alert('已登出');
        closeModal();
        fetchData(); // 重整
    } else {
        const email = prompt("請輸入管理員 Email:");
        if (!email) return;
        const password = prompt("請輸入密碼:");
        if (!password) return;

        const { data, error } = await db.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            alert("登入失敗：" + error.message);
        } else {
            alert("登入成功！");
        }
    }
}

// --- 5. 綁定篩選器監聽 ---
document.getElementById('search-input').addEventListener('input', (e) => {
    currentFilters.keyword = e.target.value.toLowerCase().trim();
    applyFilters();
});
document.getElementById('sort-select').addEventListener('change', (e) => {
    currentFilters.sort = e.target.value;
    applyFilters();
});
document.getElementById('year-select').addEventListener('change', (e) => {
    currentFilters.year = e.target.value;
    applyFilters();
});
document.getElementById('status-select').addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    applyFilters();
});
document.getElementById('country-select').addEventListener('change', (e) => {
    currentFilters.country = e.target.value;
    applyFilters();
});

// --- 6. 綜合篩選邏輯 ---
function applyFilters() {
    let result = [...allData];

    if (currentFilters.keyword) {
        result = result.filter(item => {
            const matchTitle = item.title && item.title.toLowerCase().includes(currentFilters.keyword);
            const matchAuthor = item.author && item.author.toLowerCase().includes(currentFilters.keyword);
            const matchType = item.type && (Array.isArray(item.type) ? item.type.join('') : item.type).toLowerCase().includes(currentFilters.keyword);
            return matchTitle || matchAuthor || matchType;
        });
    }
    if (currentFilters.year !== 'all') {
        result = result.filter(item => String(item.year) === currentFilters.year);
    }
    if (currentFilters.status !== 'all') {
        result = result.filter(item => item.status === currentFilters.status);
    }
    if (currentFilters.country !== 'all') {
        result = result.filter(item => item.country && item.country.includes(currentFilters.country));
    }
    if (currentFilters.sort === 'score_desc') {
        result.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (currentFilters.sort === 'score_asc') {
        result.sort((a, b) => (a.score || 0) - (b.score || 0));
    }

    renderCards(result);
}

// --- 7. 渲染卡片 ---
function renderCards(data) {
    const container = document.getElementById('book-container');
    container.innerHTML = ''; 

    if (data.length === 0) {
        container.innerHTML = '<div style="color:#888; width:100%; text-align:center; margin-top:50px; font-size:1.2em;">找不到符合條件的劇集 T^T</div>';
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.onclick = () => openModal(item);

        const imageUrl = item.cover_image ? item.cover_image : 'https://placehold.co/240x320?text=No+Image';

        let statusText = '', statusClass = '';
        switch(item.status) {
            case 'watching': statusText = '追劇中'; statusClass = 'status-watching'; break;
            case 'completed': statusText = '已看完'; statusClass = 'status-completed'; break;
            case 'plan': statusText = '待看'; statusClass = 'status-plan'; break;
            case 'dropped': statusText = '棄劇'; statusClass = 'status-dropped'; break;
        }
        const statusHtml = statusText ? `<div class="status-badge ${statusClass}">${statusText}</div>` : '';

        let tagsHtml = '';
        if (item.type && Array.isArray(item.type)) {
            tagsHtml = item.type.map(t => `<span class="tag">${t}</span>`).join('');
        } else if (item.type) {
            tagsHtml = `<span class="tag">${item.type}</span>`;
        }

        const score = parseFloat(item.score); 
        const starHtml = generateStars(score);

        card.innerHTML = `
            ${statusHtml} 
            <img src="${imageUrl}" alt="${item.title}的封面">
            <div class="card-content">
                <div class="book-title">${item.title} (${item.year})</div>
                <div style="margin-bottom: 8px;">${tagsHtml}</div>
                <div class="book-info">主演：${item.author}</div>
                <div class="book-info">
                    評分：<span class="star-rating">${starHtml}</span> (${item.score || 0})
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function generateStars(score) {
    if (!score || score == 0) return '<span style="color:#777; font-size:0.9em;">尚未評分</span>';
    let html = '';
    const fullStars = Math.floor(score); 
    const hasHalfStar = (score % 1) >= 0.5; 
    for (let i = 0; i < fullStars; i++) html += '<i class="fa-solid fa-star"></i>';
    if (hasHalfStar) html += '<i class="fa-solid fa-star-half-stroke"></i>';
    const emptyStars = 5 - (fullStars + (hasHalfStar ? 1 : 0));
    for (let i = 0; i < emptyStars; i++) html += '<i class="fa-regular fa-star"></i>';
    return html;
}

// --- 8. 彈跳視窗功能 (完全分流版) ---
function openModal(item) {
    const modalImg = document.getElementById('modal-img');
    const modalRight = document.querySelector('.modal-right');
    
    // 設定左側圖片
    modalImg.src = item.cover_image || 'https://placehold.co/300x450?text=No+Image';

    // 顯示視窗
    document.getElementById('detail-modal').style.display = 'flex';

    // 分流邏輯
    if (currentUser) {
        // 管理員登入 -> 顯示「全功能編輯表單」
        renderEditMode(item, modalRight);
    } else {
        // 訪客 -> 顯示「純瀏覽介面」
        renderViewMode(item, modalRight);
    }
}

// --- A. 渲染「純瀏覽介面」 (訪客用) ---
function renderViewMode(item, container) {
    let sText = '', sClass = '';
    switch(item.status) {
        case 'watching': sText = '追劇中'; sClass = 'pill-watching'; break;
        case 'completed': sText = '已看完'; sClass = 'pill-completed'; break;
        case 'plan': sText = '待看'; sClass = 'pill-plan'; break;
        case 'dropped': sText = '棄劇'; sClass = 'pill-dropped'; break;
        default: sText = '未知';
    }

    let tagsHtml = '';
    if (item.type && Array.isArray(item.type)) {
        tagsHtml = item.type.map(t => `<span class="tag">${t}</span>`).join('');
    }

    container.innerHTML = `
        <h2 id="modal-title" style="margin-bottom:10px; color:#fff; font-size:2em;">${item.title}</h2>
        
        <div class="modal-meta-row" style="color:#4DB6AC; font-size:1.1em; margin-bottom:15px;">
            <span id="modal-year">${item.year || '未知年份'}</span> | 
            <span id="modal-country">${item.country || '未知國家'}</span> | 
            <span id="modal-episodes">${item.episodes ? item.episodes + ' 集' : '集數未知'}</span>
        </div>
        
        <div class="modal-score-area" style="margin-bottom:15px; display:flex; align-items:center;">
            <span id="modal-stars" class="star-rating">${generateStars(item.score)}</span> 
            <span id="modal-score-text" style="color:#888; font-size:0.9em; margin-left:5px;">(${item.score || 0})</span>
        </div>

        <div class="modal-info-item" style="margin-top: 10px;">
            <span id="modal-status-text" class="modal-status-pill ${sClass}">${sText}</span>
        </div>

        <div id="modal-tags" class="modal-tags-container" style="margin: 15px 0;">
            ${tagsHtml}
        </div>

        <div class="modal-info-item" style="color:#ccc;">
            <strong>主演：</strong> <span id="modal-author">${item.author || '未標註'}</span>
        </div>

        <hr style="border-color: #444; margin: 20px 0;">

        <div class="modal-intro-section">
            <strong style="color:#eee;">劇評：</strong>
            <p id="modal-intro" style="color:#ccc; line-height:1.6; margin-top:8px;">
                ${item.introduction || '暫無劇評...'}
            </p>
        </div>
    `;
}

// --- B. 渲染「全功能編輯表單」 (管理員用) ---
function renderEditMode(item, container) {
    const tagsString = (item.type && Array.isArray(item.type)) ? item.type.join(', ') : '';

    container.innerHTML = `
        <div class="edit-mode-header">
            <span>編輯所有資料</span>
            <button onclick="closeModal()" class="close-btn" style="position:static; font-size:24px;">&times;</button>
        </div>

        <div class="form-group">
            <label class="form-label">劇名</label>
            <input type="text" id="inp-title" class="full-input" value="${item.title}">
        </div>

        <div class="form-row">
            <div>
                <label class="form-label">年份</label>
                <input type="text" id="inp-year" class="full-input" value="${item.year || ''}">
            </div>
            <div>
                <label class="form-label">國家</label>
                <select id="inp-country" class="full-input">
                    <option value="中國" ${item.country === '中國' ? 'selected' : ''}>中國</option>
                    <option value="韓國" ${item.country === '韓國' ? 'selected' : ''}>韓國</option>
                    <option value="日本" ${item.country === '日本' ? 'selected' : ''}>日本</option>
                    <option value="台灣" ${item.country === '台灣' ? 'selected' : ''}>台灣</option>
                    <option value="泰國" ${item.country === '泰國' ? 'selected' : ''}>歐美</option>
                </select>
            </div>
            <div>
                <label class="form-label">集數</label>
                <input type="number" id="inp-episodes" class="full-input" value="${item.episodes || ''}">
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">主演</label>
            <input type="text" id="inp-author" class="full-input" value="${item.author || ''}">
        </div>

        <div class="form-row">
            <div>
                <label class="form-label">狀態</label>
                <button id="status-toggle-btn" type="button"></button>
            </div>
            <div>
                <label class="form-label">評分</label>
                <input type="number" id="inp-score" class="full-input" value="${item.score}" step="0.5" max="5" min="0">
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">類型</label>
            <input type="text" id="inp-tags" class="full-input" value="${tagsString}" placeholder="例如: 古裝, 愛情">
        </div>
        
        <div class="form-group">
            <label class="form-label">封面</label>
            <input type="text" id="inp-cover" class="full-input" value="${item.cover_image || ''}" placeholder="https://...">
        </div>

        <div class="form-group">
            <label class="form-label">劇評</label>
            <textarea id="inp-intro" class="admin-textarea">${item.introduction || ''}</textarea>
        </div>

        <div class="edit-actions">
            <button id="btn-delete-full" class="btn-delete">刪除</button>
            <button id="btn-save-full" class="btn-save">儲存</button>
        </div>
    `;

    // 初始化狀態按鈕邏輯
    const statusBtn = document.getElementById('status-toggle-btn');
    const statusOrder = ['watching', 'completed', 'plan', 'dropped'];
    const statusInfo = {
        'watching': { text: '追劇中', class: 'btn-watching' },
        'completed': { text: '已看完', class: 'btn-completed' },
        'plan': { text: '待看', class: 'btn-plan' },
        'dropped': { text: '棄劇', class: 'btn-dropped' }
    };
    let currentStatus = item.status || 'watching';
    
    function updateBtn(s) {
        statusBtn.className = '';
        statusBtn.classList.add(statusInfo[s].class);
        statusBtn.innerText = statusInfo[s].text;
        statusBtn.setAttribute('data-value', s);
    }
    updateBtn(currentStatus);
    statusBtn.onclick = () => {
        let idx = statusOrder.indexOf(currentStatus);
        currentStatus = statusOrder[(idx + 1) % statusOrder.length];
        updateBtn(currentStatus);
    };

    // 綁定儲存與刪除
    document.getElementById('btn-save-full').onclick = () => updateDramaFull(item.id);
    document.getElementById('btn-delete-full').onclick = () => deleteDrama(item.id);
}

// --- 9. 更新資料庫 (全欄位版) ---
async function updateDramaFull(id) {
    const title = document.getElementById('inp-title').value;
    const year = document.getElementById('inp-year').value;
    const country = document.getElementById('inp-country').value;
    const episodes = document.getElementById('inp-episodes').value;
    const author = document.getElementById('inp-author').value;
    const score = document.getElementById('inp-score').value;
    const cover_image = document.getElementById('inp-cover').value;
    const introduction = document.getElementById('inp-intro').value;
    const status = document.getElementById('status-toggle-btn').getAttribute('data-value');
    
    // 處理標籤: 字串轉陣列
    const tagsInput = document.getElementById('inp-tags').value;
    const typeArray = tagsInput.split(',').map(t => t.trim()).filter(t => t);

    const { error } = await db
        .from('drama_list')
        .update({
            title, year, country, episodes, author, score, cover_image, introduction, status,
            type: typeArray 
        })
        .eq('id', id);

    if (error) {
        alert('修改失敗：' + error.message);
    } else {
        alert('所有資料更新成功！');
        closeModal();
        fetchData();
    }
}

// --- 10. 新增劇集模式 ---
function openAddModal() {
    const modalImg = document.getElementById('modal-img');
    const container = document.getElementById('modal-right-content');
    
    // 1. 設定預設圖片
    modalImg.src = 'https://placehold.co/300x450?text=New+Drama';

    // 2. 清空容器
    container.innerHTML = '';

    // 3. 顯示視窗
    document.getElementById('detail-modal').style.display = 'flex';

    // 4. 渲染「新增表單」
    container.innerHTML = `
        <div class="edit-mode-header">
            <span>新增劇集</span>
            <span onclick="closeModal()" class="close-btn" style="position:static; cursor:pointer; font-size:28px;">&times;</span>
        </div>

        <div class="form-group">
            <label class="form-label">劇名</label>
            <input type="text" id="add-title" class="full-input" placeholder="請輸入劇名">
        </div>

        <div class="form-row">
            <div>
                <label class="form-label">年份</label>
                <input type="text" id="add-year" class="full-input" placeholder="2026">
            </div>
            <div>
                <label class="form-label">國家</label>
                <select id="add-country" class="full-input">
                    <option value="中國">中國</option>
                    <option value="韓國">韓國</option>
                    <option value="日本">日本</option>
                    <option value="台灣">台灣</option>
                    <option value="泰國">泰國</option>
                </select>
            </div>
            <div>
                <label class="form-label">集數</label>
                <input type="number" id="add-episodes" class="full-input" placeholder="0">
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">主演</label>
            <input type="text" id="add-author" class="full-input" placeholder="演員A / 演員B">
        </div>

        <div class="form-row">
            <div>
                <label class="form-label">狀態</label>
                <button id="add-status-btn" type="button"></button>
            </div>
            <div>
                <label class="form-label">評分</label>
                <input type="number" id="add-score" class="full-input" value="0" step="0.5" max="5" min="0">
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">類型</label>
            <input type="text" id="add-tags" class="full-input" placeholder="古裝, 愛情">
        </div>
        
        <div class="form-group">
            <label class="form-label">封面圖片網址</label>
            <input type="text" id="add-cover" class="full-input" placeholder="https://...">
        </div>

        <div class="form-group">
            <label class="form-label">劇情簡介</label>
            <textarea id="add-intro" class="admin-textarea" placeholder="寫點什麼吧..."></textarea>
        </div>

        <div class="edit-actions">
            <button id="btn-submit-add" class="btn-save" style="width:100%; justify-content:center;">
                <i class="fa-solid fa-plus"></i> 確認新增
            </button>
        </div>
    `;

    // --- 初始化狀態按鈕 (預設為追劇中) ---
    const statusBtn = document.getElementById('add-status-btn');
    const statusOrder = ['watching', 'completed', 'plan', 'dropped'];
    const statusInfo = {
        'watching': { text: '追劇中', class: 'btn-watching' },
        'completed': { text: '已看完', class: 'btn-completed' },
        'plan': { text: '待看', class: 'btn-plan' },
        'dropped': { text: '棄劇', class: 'btn-dropped' }
    };
    let currentStatus = 'watching'; // 預設值
    
    function updateBtn(s) {
        statusBtn.className = '';
        statusBtn.classList.add(statusInfo[s].class);
        statusBtn.innerText = statusInfo[s].text;
        statusBtn.setAttribute('data-value', s);
    }
    updateBtn(currentStatus);

    statusBtn.onclick = () => {
        let idx = statusOrder.indexOf(currentStatus);
        currentStatus = statusOrder[(idx + 1) % statusOrder.length];
        updateBtn(currentStatus);
    };

    // 綁定確認按鈕
    document.getElementById('btn-submit-add').onclick = addNewDrama;
}

// --- 11. 執行新增資料 ---
async function addNewDrama() {
    // 1. 收集資料
    const title = document.getElementById('add-title').value;
    if (!title) { alert('請至少輸入劇名！'); return; }

    const year = document.getElementById('add-year').value;
    const country = document.getElementById('add-country').value;
    const episodes = document.getElementById('add-episodes').value || 0;
    const author = document.getElementById('add-author').value;
    const score = document.getElementById('add-score').value || 0;
    const cover_image = document.getElementById('add-cover').value;
    const introduction = document.getElementById('add-intro').value;
    const status = document.getElementById('add-status-btn').getAttribute('data-value');
    
    // 處理標籤
    const tagsInput = document.getElementById('add-tags').value;
    const typeArray = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    // 2. 寫入 Supabase (使用 insert)
    const { error } = await db
        .from('drama_list')
        .insert({
            title, year, country, episodes, author, score, cover_image, introduction, status,
            type: typeArray
        });

    if (error) {
        alert('新增失敗：' + error.message);
    } else {
        alert('🎉 新增成功！');
        closeModal();
        fetchData(); // 重新整理列表，新劇會出現在最上面
    }
}

async function deleteDrama(id) {
    if(!confirm('確定要刪除這部劇嗎？刪掉就沒囉！')) return;
    const { error } = await db.from('drama_list').delete().eq('id', id);
    if (error) { alert('刪除失敗'); } 
    else { alert('已刪除'); closeModal(); fetchData(); }
}

function closeModal() {
    document.getElementById('detail-modal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('detail-modal');
    if (event.target == modal) closeModal();
}