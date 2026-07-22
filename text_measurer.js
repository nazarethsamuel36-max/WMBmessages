const TextMeasurer = (function() {
    let canvas = null;
    let ctx = null;

    // Helper to get Canvas 2D context in browser
    function getCanvasContext() {
        if (typeof document !== 'undefined') {
            if (!canvas) {
                canvas = document.createElement('canvas');
            }
            if (!ctx) {
                ctx = canvas.getContext('2d');
            }
            return ctx;
        }
        return null;
    }

    /**
     * Measures the width of a string of text.
     * Uses Canvas API in the browser, falls back to average char width in Node.
     */
    function measureTextWidth(text, fontSize, fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif") {
        const browserCtx = getCanvasContext();
        if (browserCtx) {
            browserCtx.font = `${fontSize}px ${fontFamily}`;
            return browserCtx.measureText(text).width;
        }
        // Node Fallback: Average character width is ~0.57x of the font size for Segoe UI
        const avgCharWidth = fontSize * 0.57;
        return text.length * avgCharWidth;
    }

    /**
     * Wraps text into lines that fit within the quoteBox width.
     */
    function wrapText(text, frame, fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif") {
        if (!text) return [];
        
        const words = text.split(/\s+/);
        const lines = [];
        let currentLine = '';
        
        const maxLineWidth = frame.quoteBox.width; // 1800px
        const fontSize = frame.quote.fontSize; // 36px

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const lineWidth = measureTextWidth(testLine, fontSize, fontFamily);
            
            if (lineWidth <= maxLineWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    return {
        measureTextWidth,
        wrapText
    };
})();

// Export for Node and Browser UMD
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TextMeasurer };
} else if (typeof window !== 'undefined') {
    window.TextMeasurer = TextMeasurer;
}
