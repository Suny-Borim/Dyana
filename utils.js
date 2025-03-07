export const sendLongMessage = async (channel, text) => {
    const maxLength = 2000; 
    let startIndex = 0;

    while (startIndex < text.length) {
        const chunk = text.slice(startIndex, startIndex + maxLength); 
        await channel.send(chunk); 
        startIndex += maxLength; 
    }
};
