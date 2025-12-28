const axios = require('axios');

async function check() {
    try {
        console.log('Checking http://localhost:3000/api/bookmarks...');
        const res = await axios.get('http://localhost:3000/api/bookmarks');
        console.log('Status:', res.status);
        console.log('Headers:', res.headers);
        console.log('Data Type:', typeof res.data);
        console.log('Is Array:', Array.isArray(res.data));
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) {
             console.log('Response Status:', e.response.status);
        }
    }
}

check();