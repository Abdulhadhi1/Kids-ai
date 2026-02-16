'use server';

// NO API KEYS NEEDED! - This uses public Wikipedia and DuckDuckGo

export async function generateAnswer(question: string) {
    try {
        // Clean the question to get a good search topic
        const topic = question.replace(/^(who|what|where|when|why|how)\s(is|are|was|were|do|does|did|can|could|should|would)\s/i, '')
            .replace(/^(the|a|an)\s/i, '')
            .trim();

        console.log(`Searching Wikipedia for: "${topic}"`);

        // 1. Wikipedia Summary Search (Smart OpenSearch to handle typos)
        const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(topic)}&limit=1&format=json`;
        const searchResp = await fetch(wikiSearchUrl);
        const searchData = await searchResp.json();

        let bestTitle = topic;
        // If Wikipedia suggests a correction, use it!
        if (searchData[1] && searchData[1][0]) {
            bestTitle = searchData[1][0];
        }

        // 2. Clear Summary API
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`;
        const summaryResp = await fetch(summaryUrl);

        if (summaryResp.ok) {
            const data = await summaryResp.json();

            if (data.extract) {
                return {
                    title: data.title,
                    description: data.description || "Encyclopedia Entry",
                    text: data.extract,
                    source: "Wikipedia 📚",
                    image: data.thumbnail?.source || null, // Use Wikipedia image if available
                    url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(bestTitle)}`
                };
            }
        }

        // 3. Fallback: DuckDuckGo Instant Answer
        const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(topic)}&format=json&no_html=1&skip_disambig=1`;
        const ddgResp = await fetch(ddgUrl);
        if (ddgResp.ok) {
            const ddgData = await ddgResp.json();
            if (ddgData.AbstractText) {
                return {
                    title: ddgData.Heading || topic,
                    description: "Instant Answer",
                    text: ddgData.AbstractText,
                    source: "DuckDuckGo 🦆",
                    image: ddgData.Image || null,
                    url: ddgData.AbstractURL || null
                };
            }
        }

        return null; // found nothing

    } catch (error) {
        console.error("Search Error:", error);
        return null;
    }
}
