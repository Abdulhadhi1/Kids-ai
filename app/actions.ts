const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export async function generateAnswer(question: string) {
    try {
        // Clean the question to get a good search topic
        const topic = question.replace(/^(who|what|where|when|why|how)\s(is|are|was|were|do|does|did|can|could|should|would)\s/i, '').trim();

        // ---------------------------------------------------------
        // STRATEGY 1: DuckDuckGo Instant Answer (Great for definitions/facts)
        // ---------------------------------------------------------
        try {
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(topic)}&format=json&no_html=1&skip_disambig=1`;
            const ddgResponse = await fetch(ddgUrl);

            if (ddgResponse.ok) {
                const ddgData = await ddgResponse.json();
                const abstract = ddgData.AbstractText;

                if (abstract && abstract.length > 20) {
                    return `Quack! 🦆 Here is what I found: \n\n ${abstract} \n\n (Source: DuckDuckGo)`;
                }
            }
        } catch (ddgError) {
            console.warn("DuckDuckGo failed, trying Wikipedia...", ddgError);
        }

        // ---------------------------------------------------------
        // STRATEGY 2: Wikipedia Summary (Great for famous people/places)
        // ---------------------------------------------------------
        try {
            // Try searching for the page first to handle capitalization/typos
            const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(topic)}&limit=1&format=json`;
            const searchResp = await fetch(wikiSearchUrl);
            const searchData = await searchResp.json();

            // If we found a matching page title
            if (searchData[1] && searchData[1][0]) {
                const bestTitle = searchData[1][0];
                const wikiSummaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`;
                const summaryResp = await fetch(wikiSummaryUrl);

                if (summaryResp.ok) {
                    const makeData = await summaryResp.json();
                    if (makeData.extract) {
                        return `Here is what I found on Wikipedia: \n\n ${makeData.extract} \n\n (Source: Wikipedia 📚)`;
                    }
                }
            }
        } catch (wikiError) {
            console.warn("Wikipedia failed too.", wikiError);
        }

        // ---------------------------------------------------------
        // STRATEGY 3: Ultimate Fallback (Google Link)
        // ---------------------------------------------------------
        return `I looked everywhere but couldn't find a simple answer for "${topic}". \n\n But Google definitely knows! \n [Click here to search Google](https://www.google.com/search?q=${encodeURIComponent(question)})`;

    } catch (error) {
        console.error("Search API Error:", error);
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
