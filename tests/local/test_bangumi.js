const axios = require('axios');

async function testBangumi() {
    const username = 'shadowquake';
    const url = `https://api.bgm.tv/v0/users/${username}/collections?subject_type=2&type=3&limit=50`;
    
    console.log(`Testing Bangumi API: ${url}`);
    
    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'ShadowSky/1.0 (Test)',
                'Accept': 'application/json'
            },
            timeout: 10000
        });
        console.log('✅ Success!');
        console.log(`Status: ${res.status}`);
        console.log(`Data count: ${res.data.data ? res.data.data.length : 'N/A'}`);
    } catch (e) {
        console.error('❌ Failed!');
        console.error(`Message: ${e.message}`);
        if (e.response) {
            console.error(`Status: ${e.response.status}`);
            console.error(`Data: ${JSON.stringify(e.response.data)}`);
        }
    }
}

testBangumi();
