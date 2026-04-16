// Configuration
const colors = {
    'Eduardo Riedel': '#4F46E5', // Indigo
    'Marcos Pollon': '#8B5CF6', // Purple
    'Fabio Trad': '#10B981', // Green
    'João Henrique Catan': '#F59E0B', // Orange
    'Governo MS': '#1E293B', // Slate
};

const candidateKeys = ['Eduardo Riedel', 'Marcos Pollon', 'Fabio Trad', 'João Henrique Catan'];

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
    'Marcos Pollon': {
        timeSeries: './dados/google-trends/marcospollon/time_series_BR_20260116-0839_20260416-0839.csv',
        topQueries: './dados/google-trends/marcospollon/searched_with_top-queries_BR_20260116-0839_20260416-0839.csv',
        risingQueries: './dados/google-trends/marcospollon/searched_with_rising-queries_BR_20260116-0839_20260416-0839.csv'
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

// Navigation
function switchView(view) {
    const secGovms = document.getElementById('sec-govms');
    const secCandidates = document.getElementById('sec-candidates');
    const navGovms = document.getElementById('nav-govms');
    const navCandidates = document.getElementById('nav-candidates');

    if (view === 'govms') {
        secGovms.classList.remove('hidden-section');
        secCandidates.classList.add('hidden-section');
        navGovms.classList.add('border-indigo-500', 'text-gray-900');
        navGovms.classList.remove('border-transparent', 'text-gray-500');
        navCandidates.classList.add('border-transparent', 'text-gray-500');
        navCandidates.classList.remove('border-indigo-500', 'text-gray-900');
    } else {
        secGovms.classList.add('hidden-section');
        secCandidates.classList.remove('hidden-section');
        navCandidates.classList.add('border-indigo-500', 'text-gray-900');
        navCandidates.classList.remove('border-transparent', 'text-gray-500');
        navGovms.classList.add('border-transparent', 'text-gray-500');
        navGovms.classList.remove('border-indigo-500', 'text-gray-900');
    }
}

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
    const profile = globalData.socialMedia.find(p => p.nome === entity);
    
    if (profile) {
        document.getElementById('govms-insta-followers').textContent = formatNum(profile.redes_sociais.instagram.seguidores);
        document.getElementById('govms-fb-likes').textContent = formatNum(profile.redes_sociais.facebook.curtidas);
        document.getElementById('govms-tiktok-followers').textContent = formatNum(profile.redes_sociais.tiktok.seguidores);
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
    const tsData = trends.timeSeries;
    const timeKey = Object.keys(tsData[0] || {}).find(k => k.toLowerCase() === 'time');
    const valKey = Object.keys(tsData[0] || {}).find(k => k.toLowerCase() !== 'time');

    const labels = tsData.map(d => d[timeKey]);
    const values = tsData.map(d => Number(d[valKey]));

    if (chartGovMS) chartGovMS.destroy();
    chartGovMS = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Search Interest',
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
    // 1. Instagram Table
    const tbodyInsta = document.getElementById('candidates-insta-table');
    const candidatesProfiles = globalData.socialMedia.filter(p => candidateKeys.includes(p.nome));
    
    tbodyInsta.innerHTML = candidatesProfiles.map(p => {
        const isRiedel = p.nome === 'Eduardo Riedel';
        const bgClass = isRiedel ? 'bg-indigo-50/50' : '';
        const nameClass = isRiedel ? 'font-bold text-indigo-700' : 'font-medium text-gray-900';
        return `
        <tr class="${bgClass}">
            <td class="px-6 py-4 whitespace-nowrap ${nameClass}">
                <div class="flex items-center">
                    <span class="inline-block w-3 h-3 rounded-full mr-2" style="background-color: ${colors[p.nome]}"></span>
                    ${p.nome}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right font-medium">${formatNum(p.redes_sociais.instagram.seguidores)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right">${p.redes_sociais.instagram.taxa_engajamento_pct}%</td>
            <td class="px-6 py-4 whitespace-nowrap text-right">${formatNum(p.redes_sociais.instagram.media_curtidas)}</td>
        </tr>`;
    }).join('');

    // 2. Comparative Line Chart
    const datasets = [];
    let labels = [];

    candidateKeys.forEach(cand => {
        const tsData = globalData.trends[cand].timeSeries;
        if(tsData.length > 0) {
            const timeKey = Object.keys(tsData[0] || {}).find(k => k.toLowerCase() === 'time');
            const valKey = Object.keys(tsData[0] || {}).find(k => k.toLowerCase() !== 'time');
            
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
            if(!arr || arr.length === 0) return '<tr><td colspan="2" class="text-gray-400 text-xs py-2 italic text-center">No data</td></tr>';
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
                <h5 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Top Queries</h5>
                <table class="w-full text-left table-fixed">
                    <tbody>${renderRows(top)}</tbody>
                </table>
            </div>
            
            <div>
                <h5 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Rising Queries</h5>
                <table class="w-full text-left table-fixed">
                    <tbody>${renderRows(rising, true)}</tbody>
                </table>
            </div>
        </div>`;
    }).join('');
}

// Init
window.onload = loadAllData;
