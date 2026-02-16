export async function generateAnswer(question: string) {
    // Determine user intention (image vs info)
    const isImageRequest = /show|image|photo|picture|look like/i.test(question);

    // Construct Google Search URLs
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(question)}`;
    const googleImageSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(question)}`;

    if (isImageRequest) {
        return `I found some pictures for you! \n\n [Click here to see pictures of "${question}"](${googleImageSearchUrl})`;
    } else {
        return `Here is what I found on Google! \n\n [Click here to learn about "${question}"](${googleSearchUrl}) \n\n (I can't think of my own answer right now, but Google knows everything!)`;
    }
}

export async function getRelatedImages(query: string) {
    if (!UNSPLASH_ACCESS_KEY) {
        console.warn("Unsplash API Key missing");
        return [];
    }

    try {
        // IMPROVEMENT: Clean the query to get better images.
        // Remove "who is", "what is", etc. for better search results.
        const cleanQuery = query.replace(/^(who|what|where|when|why|how)\s(is|are|was|were|do|does|did)\s/i, '').trim();
        const searchTerm = cleanQuery || query; // Fallback to original if empty

        console.log(`Searching images for: ${searchTerm}`);

        const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=3&orientation=squarish`, {
            headers: {
                Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Unsplash error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.results.map((img: any) => img.urls.small);
    } catch (error) {
        console.error("Unsplash API Error:", error);
        return [];
    }
}
