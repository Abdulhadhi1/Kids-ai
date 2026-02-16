const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export async function generateAnswer(question: string) {
    try {
        // Clean the question to get a good search topic
        const topic = question.replace(/^(who|what|where|when|why|how)\s(is|are|was|were|do|does|did|can|could|should|would)\s/i, '').trim();
        const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;

        const response = await fetch(searchUrl);
        if (!response.ok) {
            return `I couldn't find a simple explanation for "${topic}". \n\n But you can check Google! \n [Click here to search Google](https://www.google.com/search?q=${encodeURIComponent(question)})`;
        }

        const data = await response.json();

        let answer = data.extract;
        if (!answer) {
            return `I found the topic "${topic}" but I'm not sure how to explain it simply. \n\n Try asking differently or check Google! \n [Click here](https://www.google.com/search?q=${encodeURIComponent(question)})`;
        }

        // Add a friendly intro
        return `Here is what I know about ${topic}: \n\n ${answer} \n\n (Source: Wikipedia 📚)`;

    } catch (error) {
        console.error("Wikipedia API Error:", error);
        return `Oops! I had trouble finding an answer. \n\n You can search Google here: \n [Click here](https://www.google.com/search?q=${encodeURIComponent(question)})`;
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
