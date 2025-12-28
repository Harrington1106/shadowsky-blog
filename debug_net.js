
try {
    console.log("Testing connection to host.retiehe.com...");
    const response = await fetch("https://host.retiehe.com");
    console.log("Status:", response.status);
    console.log("Success!");
} catch (error) {
    console.error("Fetch Error Details:", error);
    if (error.cause) {
        console.error("Cause:", error.cause);
    }
}
