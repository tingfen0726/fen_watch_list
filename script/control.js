
// 全域變數
let allData = []; 
let currentFilters = {
    keyword: '',
    sort: 'default',
    year: 'all',
    status: 'all',
    country: 'all'
};

// 1. 抓取資料
fetch('book.json')
    .then(response => response.json())
    .then(data => {
        allData = data;

        const yearSelect = document.getElementById('year-select');
        const allYears = data.map(item => item.year).filter(y => y);
        const uniqueYears = [...new Set(allYears)].sort((a, b) => b - a);
        uniqueYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });

        renderCards(allData);
    })
    .catch(error => console.error('無法讀取資料:', error));

// 2. 綁定監聽器 (保持不變)
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

// 3. 核心功能：綜合篩選邏輯 (保持不變)
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

// 4. 渲染卡片 (✨ 這裡有微調：加入點擊事件)
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
        
        // ✨ 新增：讓卡片變成手指游標，並綁定點擊事件
        card.style.cursor = 'pointer';
        card.onclick = () => openModal(item);

        // 圖片
        const imageUrl = item.cover_image ? item.cover_image : 'https://placehold.co/240x320?text=No+Image';

        // 狀態標籤
        let statusText = '', statusClass = '';
        switch(item.status) {
            case 'watching': statusText = '追劇中'; statusClass = 'status-watching'; break;
            case 'completed': statusText = '已看完'; statusClass = 'status-completed'; break;
            case 'plan': statusText = '待看'; statusClass = 'status-plan'; break;
            case 'dropped': statusText = '棄劇'; statusClass = 'status-dropped'; break;
        }
        const statusHtml = statusText ? `<div class="status-badge ${statusClass}">${statusText}</div>` : '';

        // 類型標籤
        let tagsHtml = '';
        if (item.type && Array.isArray(item.type)) {
            tagsHtml = item.type.map(t => `<span class="tag">${t}</span>`).join('');
        } else if (item.type) {
            tagsHtml = `<span class="tag">${item.type}</span>`;
        }

        // 星星
        const score = parseFloat(item.score); 
        const starHtml = generateStars(score);

        card.innerHTML = `
            ${statusHtml} 
            <img src="${imageUrl}" alt="${item.title}的封面">
            
            <div class="card-content">
                <div class="book-title">${item.title} (${item.year})</div>
                <div style="margin-bottom: 8px;">${tagsHtml}</div>
                <div class="book-info">主演：${item.author}</div>
                <div class="book-info">集數：${item.episodes || '?'}</div>
                <div class="book-info">
                    評分：<span class="star-rating">${starHtml}</span> (${item.score || 0})
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// 星星產生器 (保持不變)
function generateStars(score) {
    if (!score || score == 0) {
        return '<span style="color: #777; font-size: 0.9em;">尚未評分</span>';
    }
    let html = '';
    const fullStars = Math.floor(score); 
    const hasHalfStar = (score % 1) >= 0.5; 
    for (let i = 0; i < fullStars; i++) html += '<i class="fa-solid fa-star"></i>';
    if (hasHalfStar) html += '<i class="fa-solid fa-star-half-stroke"></i>';
    const emptyStars = 5 - (fullStars + (hasHalfStar ? 1 : 0));
    for (let i = 0; i < emptyStars; i++) html += '<i class="fa-regular fa-star"></i>';
    return html;
}

// 重置篩選 (保持不變)
function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('sort-select').value = 'default';
    document.getElementById('year-select').value = 'all';
    document.getElementById('status-select').value = 'all';
    document.getElementById('country-select').value = 'all';
    currentFilters = { keyword: '', sort: 'default', year: 'all', status: 'all', country: 'all' };
    applyFilters();
}

// --- ✨ 新增：彈跳視窗功能 (放大 Div) ---
function openModal(item) {
    // 1. 填入資料
    document.getElementById('modal-img').src = item.cover_image || 'https://placehold.co/300x450?text=No+Image';
    document.getElementById('modal-title').innerText = item.title;
    
    document.getElementById('modal-year').innerText = item.year || '未知';
    document.getElementById('modal-country').innerText = item.country || '未知';
    document.getElementById('modal-episodes').innerText = item.episodes ? `${item.episodes} 集` : '未知 集';
    
    document.getElementById('modal-author').innerText = item.author || '未標註';

    const statusSpan = document.getElementById('modal-status-text');
    statusSpan.className = 'modal-status-pill';
    // 狀態文字轉換
    let sText = '';
    let sClass = '';

    // 2. 根據狀態決定文字和要加上哪個顏色 class
    switch(item.status) {
        case 'watching':
            sText = '=追劇中';
            sClass = 'pill-watching';
            break;
        case 'completed':
            sText = '已看完';
            sClass = 'pill-completed';
            break;
        case 'plan':
            sText = '待看';
            sClass = 'pill-plan';
            break;
        case 'dropped':
            sText = '棄劇';
            sClass = 'pill-dropped';
            break;
        default:
            sText = '未知狀態';
            statusSpan.style.backgroundColor = '#555';
    }

    // 3. 填入文字並加上顏色 class
    statusSpan.innerText = sText;
    if (sClass) {
        statusSpan.classList.add(sClass);
    }

    // 星星與分數
    document.getElementById('modal-stars').innerHTML = generateStars(item.score);
    document.getElementById('modal-score-text').innerText = item.score ? `(${item.score})` : '';

    // 類型 Tag
    const tagBox = document.getElementById('modal-tags');
    tagBox.innerHTML = '';
    if (item.type && Array.isArray(item.type)) {
        item.type.forEach(t => {
            tagBox.innerHTML += `<span class="tag" style="font-size:0.9em; padding:4px 10px;">${t}</span>`;
        });
    }

    // 簡介
    document.getElementById('modal-intro').innerText = item.introduction || '暫無詳細劇情簡介...';

    // 2. 顯示視窗
    document.getElementById('detail-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('detail-modal').style.display = 'none';
}

// 點擊視窗外圍也能關閉
window.onclick = function(event) {
    const modal = document.getElementById('detail-modal');
    if (event.target == modal) {
        closeModal();
    }
}
