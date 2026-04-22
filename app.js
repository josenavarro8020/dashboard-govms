// Configuration
const colors = {
    'Eduardo Riedel': '#4F46E5', // Indigo
    'Fabio Trad': '#10B981', // Green
    'João Henrique Catan': '#F59E0B', // Orange
    'Governo MS': '#1E293B', // Slate
};

const candidateKeys = ['Eduardo Riedel', 'Fabio Trad', 'João Henrique Catan'];

const filePaths = {
    'Governo MS': {
        timeSeries: './dados/google-trends/govms/time_series_BR_20260116-0847_20260416-0847.csv',
        topQueries: './dados/google-trends/govms/searched_with_top-queries_BR_20260116-0847_20260416-0847.csv',
        risingQueries: './dados/google-trends/govms/searched_with_rising-queries_BR_20260116-0847_20260416-0847.csv'
    },
    'Eduardo Riedel': {
        timeSeries: './dados/google-trends/eduardoriedel/time_series_BR_20260116-0834_20260416-0834.csv',
        topQueries: './dados/google-trends/eduardoriedel/searched_with_top-queries_BR_20260116-0839_20260416-0839.csv',
        risingQueries: './dados/google-trends/eduardoriedel/searched_with_rising-queries_BR_20260116-0839_20260416-0839.csv'
    },

    'Fabio Trad': {
        timeSeries: './dados/google-trends/fabiotrad/time_series_BR_20260116-0840_20260416-0840.csv',
        topQueries: './dados/google-trends/fabiotrad/searched_with_top-queries_BR_20260116-0840_20260416-0840.csv',
        risingQueries: './dados/google-trends/fabiotrad/searched_with_rising-queries_BR_20260116-0840_20260416-0840.csv'
    },
    'João Henrique Catan': {
        timeSeries: './dados/google-trends/joaohenriquecatan/time_series_BR_20260116-0841_20260416-0841.csv',
        topQueries: './dados/google-trends/joaohenriquecatan/searched_with_top-queries_BR_20260116-0841_20260416-0841.csv',
        risingQueries: './dados/google-trends/joaohenriquecatan/searched_with_rising-queries_BR_20260116-0841_20260416-0841.csv'
    }
};

let chartGovMS = null;
let chartCandidates = null;
let globalData = {};

// Navigation removed for single-page layout

// Formatters
const formatNum = (num) => new Intl.NumberFormat('pt-BR').format(num);

// Utility: parse CSV string skipping metadata rows
function parseCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length === 0) return [];
    
    let headerIdx = -1;
    // Find header
    for (let i = 0; i < lines.length; i++) {
        const lineVal = lines[i].toLowerCase();
        if (lineVal.startsWith('time') || lineVal.startsWith('"time"') || 
            lineVal.startsWith('query') || lineVal.startsWith('"query"')) {
            headerIdx = i;
            break;
        }
    }
    
    if (headerIdx === -1) return []; // No recognizable header found

    const headers = lines[headerIdx].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    const data = [];
    
    for (let i = headerIdx + 1; i < lines.length; i++) {
        // Simple CSV parse handling quotes simply (assuming standard Google Trends format)
        if(!lines[i].trim()) continue;
        const rowString = lines[i];
        
        let cols = [];
        let inQuotes = false;
        let currentWord = '';
        
        for (let char of rowString) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                cols.push(currentWord.trim());
                currentWord = '';
            } else {
                currentWord += char;
            }
        }
        cols.push(currentWord.trim());
        
        const rowObj = {};
        headers.forEach((h, idx) => {
            rowObj[h] = cols[idx] !== undefined ? cols[idx] : null;
        });
        data.push(rowObj);
    }
    return data;
}
// Utility: Group time series by month and average
function aggregateMonthly(data, timeKey, valKey) {
    if(!data || data.length === 0) return [];

    const monthMap = {};
    const monthLabels = [];

    data.forEach(row => {
        const dateStr = row[timeKey]; 
        const valStr = row[valKey];
        if(!dateStr) return;

        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) return;
        
        const year = dateObj.getFullYear();
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const monthName = monthNames[dateObj.getMonth()];
        const monthKey = `${monthName} ${year}`;
        const numericKey = `${year}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`; // For sorting

        if (!monthMap[numericKey]) {
            monthMap[numericKey] = { label: monthKey, sum: 0, count: 0 };
            monthLabels.push(numericKey);
        }

        const val = Number(valStr);
        if(!isNaN(val)) {
            monthMap[numericKey].sum += val;
            monthMap[numericKey].count += 1;
        }
    });

    return Object.keys(monthMap).sort().map(nk => {
        const item = monthMap[nk];
        const sum = item.sum.toFixed(2);
        return { [timeKey]: item.label, [valKey]: sum };
    });
}

function generateSocialMediaCard(cand, showHeader = true) {
    const profile = globalData.socialMedia.find(p => p.nome === cand) || {redes_sociais: {instagram:{}, facebook:{}, tiktok:{}}};
    const rs = profile.redes_sociais;
    const insta = rs.instagram || {};
    const fb = rs.facebook || {};
    const tk = rs.tiktok || {};

    const headerHtml = showHeader ? `
        <h4 class="text-xl font-bold mb-4 flex items-center" style="color: ${colors[cand]}">
            <span class="inline-block w-4 h-4 rounded-full mr-2" style="background-color: ${colors[cand]}"></span>
            ${cand}
        </h4>` : '';

    return `
    <div class="mb-8">
        ${headerHtml}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Instagram Card -->
            <div class="card border-t-4" style="border-top-color: #E1306C; background: linear-gradient(to bottom, #fff0f5 0%, #ffffff 100%);">
                <div class="flex items-center mb-4">
                    <span class="p-2 rounded-md font-bold text-white text-xs mr-3 shadow" style="background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);">IG</span>
                    <h4 class="text-lg font-bold text-gray-900">Instagram</h4>
                </div>
                <div class="space-y-4">
                    <div>
                        <p class="text-sm font-medium text-gray-500">Seguidores</p>
                        <p class="text-2xl font-bold text-gray-900">${formatNum(insta.seguidores || 0)}</p>
                    </div>
                    <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        <div>
                            <p class="text-xs text-gray-500">Engajamento</p>
                            <p class="font-semibold text-gray-800">${insta.taxa_engajamento_pct || 0}%</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500">Média de Curtidas</p>
                            <p class="font-semibold text-gray-800">${formatNum(insta.media_curtidas || 0)}</p>
                        </div>
                        <div class="col-span-2">
                            <p class="text-xs text-gray-500">Média de Comentários</p>
                            <p class="font-semibold text-gray-800">${formatNum(insta.media_comentarios || 0)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Facebook Card -->
            <div class="card border-t-4" style="border-top-color: #1877F2; background: linear-gradient(to bottom, #eff6ff 0%, #ffffff 100%);">
                <div class="flex items-center mb-4">
                    <span class="p-2 rounded-md font-bold text-white text-xs mr-3 shadow" style="background:#1877F2;">FB</span>
                    <h4 class="text-lg font-bold text-gray-900">Facebook</h4>
                </div>
                <div class="space-y-4">
                    <div>
                        <p class="text-sm font-medium text-gray-500">Curtidas na Página</p>
                        <p class="text-2xl font-bold text-gray-900">${formatNum(fb.curtidas || 0)}</p>
                    </div>
                    <div class="pt-4 border-t border-gray-100">
                        <p class="text-xs text-gray-500">Falando Sobre</p>
                        <p class="font-semibold text-gray-800">${formatNum(fb.pessoas_falando || 0)}</p>
                    </div>
                </div>
            </div>

            <!-- TikTok Card -->
            <div class="card border-t-4" style="border-top-color: #000000; background: linear-gradient(to bottom, #f8fafc 0%, #ffffff 100%);">
                <div class="flex items-center mb-4">
                    <span class="p-2 rounded-md font-bold text-white text-xs mr-3 shadow flex items-center justify-center" style="background: linear-gradient(135deg, #00f2fe 0%, #000000 50%, #fe0979 100%); min-width: 32px">
                       <span class="bg-transparent tracking-widest text-white">TK</span>
                    </span>
                    <h4 class="text-lg font-bold text-gray-900">TikTok</h4>
                </div>
                <div class="space-y-4">
                    <div>
                        <p class="text-sm font-medium text-gray-500">Seguidores</p>
                        <p class="text-2xl font-bold text-gray-900">${formatNum(tk.seguidores || 0)}</p>
                    </div>
                    <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        <div>
                            <p class="text-xs text-gray-500">Total de Curtidas</p>
                            <p class="font-semibold text-gray-800">${formatNum(tk.curtidas_totais || 0)}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500">Vídeos</p>
                            <p class="font-semibold text-gray-800">${formatNum(tk.videos || 0)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function renderCandidateCards() {
    const container = document.getElementById('candidate-cards-container');
    if(!container) return;

    container.innerHTML = candidateKeys.map(cand => generateSocialMediaCard(cand)).join('');
}

// Fetch all required data
async function loadAllData() {
    try {
        // Load JSON
        const responseJSON = await fetch('./dados/socialmedia.json');
        if (!responseJSON.ok) throw new Error('Could not load JSON');
        const socialMediaText = await responseJSON.json();
        
        globalData.socialMedia = socialMediaText.perfis;
        
        // Load CSVs
        globalData.trends = {};
        for (const [entity, paths] of Object.entries(filePaths)) {
            globalData.trends[entity] = { timeSeries: [], topQueries: [], risingQueries: [] };
            
            // Time Series
            try {
                const resTS = await fetch(paths.timeSeries);
                if (resTS.ok) globalData.trends[entity].timeSeries = parseCSV(await resTS.text());
            } catch (e) { console.error('Error fetching TS for ' + entity, e); }
            
            // Top Queries
            try {
                const resTop = await fetch(paths.topQueries);
                if (resTop.ok) globalData.trends[entity].topQueries = parseCSV(await resTop.text());
            } catch (e) { console.error('Error fetching Top for ' + entity, e); }
            
            // Rising Queries
            try {
                const resRis = await fetch(paths.risingQueries);
                if (resRis.ok) globalData.trends[entity].risingQueries = parseCSV(await resRis.text());
            } catch (e) { console.error('Error fetching Rising for ' + entity, e); }
        }
        
        renderGovernoMS();
        renderCandidates();
        
    } catch(err) {
        console.error("Error loading data:", err);
        alert("Failed to load local data. Make sure you are running a local web server (e.g., npx serve) so fetch works.");
    }
}

// Rendering Governing MS
function renderGovernoMS() {
    const entity = 'Governo MS';
    
    const container = document.getElementById('govms-social-card-container');
    if (container) {
        // showHeader=false since the card wrapper already has a title
        container.innerHTML = generateSocialMediaCard(entity, false);
    }

    const trends = globalData.trends[entity];
    
    // Top Queries
    const tbodyTop = document.getElementById('govms-top-queries');
    tbodyTop.innerHTML = trends.topQueries.slice(0, 10).map(t => 
        `<tr><td class="px-4 py-3 whitespace-nowrap capitalize">${t.query || t.Query || ''}</td>
             <td class="px-4 py-3 whitespace-nowrap text-right text-gray-500">${t['search interest'] || t['Search Interest'] || ''}</td></tr>`
    ).join('');

    // Rising Queries
    const tbodyRising = document.getElementById('govms-rising-queries');
    tbodyRising.innerHTML = trends.risingQueries.slice(0, 10).map(t => 
        `<tr><td class="px-4 py-3 whitespace-nowrap capitalize">${t.query || t.Query || ''}</td>
             <td class="px-4 py-3 whitespace-nowrap text-right text-green-600 font-medium">${t['increase percent'] || t['Increase'] || ''}</td></tr>`
    ).join('');

    // Time Series Line Chart
    const ctx = document.getElementById('chart-govms-timeline').getContext('2d');
    let tsData = trends.timeSeries;
    const timeKey = Object.keys(tsData[0] || {}).find(k => k.toLowerCase() === 'time');
    const valKey = Object.keys(tsData[0] || {}).find(k => k.toLowerCase() !== 'time');

    tsData = aggregateMonthly(tsData, timeKey, valKey);

    const labels = tsData.map(d => d[timeKey]);
    const values = tsData.map(d => Number(d[valKey]));

    if (chartGovMS) chartGovMS.destroy();
    chartGovMS = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Interesse de Busca',
                data: values,
                borderColor: colors[entity],
                backgroundColor: colors[entity] + '20', // Hex + alpha
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true },
                x: { grid: { display: false } }
            }
        }
    });
}

// Rendering Candidates
function renderCandidates() {
    // 1. Candidate Details Cards
    renderCandidateCards();

    // 2. Comparative Line Chart
    const datasets = [];
    let labels = [];

    candidateKeys.forEach(cand => {
        let tsData = globalData.trends[cand].timeSeries;
        if(tsData.length > 0) {
            const timeKey = Object.keys(tsData[0] || {}).find(k => k.toLowerCase() === 'time');
            const valKey = Object.keys(tsData[0] || {}).find(k => k.toLowerCase() !== 'time');
            
            tsData = aggregateMonthly(tsData, timeKey, valKey);

            if (labels.length === 0) labels = tsData.map(d => d[timeKey]);
            datasets.push({
                label: cand,
                data: tsData.map(d => Number(d[valKey])),
                borderColor: colors[cand],
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 4
            });
        }
    });

    const ctx = document.getElementById('chart-candidates-timeline').getContext('2d');
    if (chartCandidates) chartCandidates.destroy();
    chartCandidates = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top' },
                tooltip: { usePointStyle: true }
            },
            scales: {
                y: { beginAtZero: true },
                x: { grid: { display: false } }
            }
        }
    });

    // 3. Search Terms Grid (4 Columns)
    const gridEl = document.getElementById('candidates-search-grid');
    gridEl.innerHTML = candidateKeys.map(cand => {
        const top = globalData.trends[cand].topQueries.slice(0, 5);
        const rising = globalData.trends[cand].risingQueries.slice(0, 5);

        const renderRows = (arr, isRising = false) => {
            if(!arr || arr.length === 0) return '<tr><td colspan="2" class="text-gray-400 text-xs py-2 italic text-center">Sem dados</td></tr>';
            return arr.map(t => `
                <tr class="border-b border-gray-100 last:border-0">
                    <td class="py-2 text-xs truncate max-w-[120px] capitalize" title="${t.query || t.Query || ''}">${t.query || t.Query || ''}</td>
                    <td class="py-2 text-xs text-right ${isRising ? 'text-green-600 font-medium' : 'text-gray-500'}">
                        ${isRising ? (t['increase percent'] || t['Increase'] || '') : (t['search interest'] || t['Search Interest'] || '')}
                    </td>
                </tr>
            `).join('');
        };

        return `
        <div class="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
            <h4 class="font-bold mb-3 flex items-center text-sm" style="color: ${colors[cand]}">
                <span class="inline-block w-2.5 h-2.5 rounded-full mr-2" style="background-color: ${colors[cand]}"></span>
                ${cand}
            </h4>
            
            <div class="mb-4">
                <h5 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Principais Consultas</h5>
                <table class="w-full text-left table-fixed">
                    <tbody>${renderRows(top)}</tbody>
                </table>
            </div>
            
            <div>
                <h5 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Consultas em Ascensão</h5>
                <table class="w-full text-left table-fixed">
                    <tbody>${renderRows(rising, true)}</tbody>
                </table>
            </div>
        </div>`;
    }).join('');
}

// Init
window.onload = loadAllData;
