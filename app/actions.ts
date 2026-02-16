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
    // Return empty array since we are linking to Google Images instead
    return [];
}
