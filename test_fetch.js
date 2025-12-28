const apiKey = "aac3af34-a49c-4fa3-9c40-ba56719625ae";
const url = "https://api.retiehe.com/backend/api-key-v2/verification?key=" + apiKey;

console.log("Fetching: " + url);

// Use the same options as the CLI might use
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

fetch(url, {
    headers: {
        "User-Agent": "Retinbox-CLI/4.0.18"
    }
})
.then(res => {
    console.log("Status: " + res.status);
    return res.text();
})
.then(text => {
    console.log("Body: " + text.substring(0, 200));
})
.catch(err => {
    console.error("Fetch Error:", err);
    if (err.cause) {
        console.error("Cause:", err.cause);
    }
});
