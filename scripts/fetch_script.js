// 1. Log in to Bilibili in your browser
// 2. Open this URL: https://space.bilibili.com/1042546043/video
// 3. Press F12 to open Developer Tools, go to the "Console" tab
// 4. Copy and paste the code below into the Console and press Enter
// 5. Copy the output and paste it into d:\shadowsky\js\video-loader.js replacing the defaultVideos array

async function fetchVideos(mid) {
    const url = `https://api.bilibili.com/x/space/arc/search?mid=${mid}&ps=30&tid=0&pn=1&keyword=&order=pubdate&jsonp=jsonp`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 0) {
            const vlist = data.data.list.vlist;
            const formattedVideos = vlist.map((v, index) => ({
                id: index + 1,
                title: v.title,
                thumbnail: v.pic.replace('http:', 'https:'),
                duration: v.length,
                views: v.play >= 10000 ? (v.play/10000).toFixed(1) + 'w' : v.play,
                category: 'other', // You can manually adjust categories later
                type: 'bilibili',
                bvid: v.bvid
            }));
            
            console.log('// Copy the following code into js/video-loader.js:');
            console.log('const defaultVideos = ' + JSON.stringify(formattedVideos, null, 4) + ';');
            return formattedVideos;
        } else {
            console.error('API Error:', data.message);
        }
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

fetchVideos('510141669');
