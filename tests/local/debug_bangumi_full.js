const axios = require('axios');

const USERNAME = 'shadowquake';
const API_BASE = 'https://api.bgm.tv/v0';

async function fetchCollectionCount(subjectType, type) {
    const url = `${API_BASE}/users/${USERNAME}/collections?subject_type=${subjectType}&type=${type}&limit=1`;
    try {
        const res = await axios.get(url, { 
            headers: { 'User-Agent': 'ShadowSky/Debug' },
            validateStatus: () => true 
        });
        if (res.status === 200) {
            return res.data.total;
        }
        return `Error ${res.status}`;
    } catch (e) {
        return `Fail: ${e.message}`;
    }
}

const TYPE_MAP = {
    1: 'Wish (想看)',
    2: 'Collect (看过)',
    3: 'Do (在看)',
    4: 'On Hold (搁置)',
    5: 'Dropped (抛弃)'
};

async function run() {
    console.log(`Checking collections for user: ${USERNAME}`);
    console.log('----------------------------------------');
    
    // Anime (Subject Type 2)
    console.log('--- ANIME (Type 2) ---');
    for (let i = 1; i <= 5; i++) {
        const count = await fetchCollectionCount(2, i);
        console.log(`Type ${i} [${TYPE_MAP[i]}]: ${count}`);
    }

    // Manga (Subject Type 1)
    console.log('\n--- MANGA (Type 1) ---');
    for (let i = 1; i <= 5; i++) {
        const count = await fetchCollectionCount(1, i);
        console.log(`Type ${i} [${TYPE_MAP[i]}]: ${count}`);
    }
}

run();
