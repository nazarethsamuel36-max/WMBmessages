const PresentationFrame = (function() {
    // 16:9 Virtual Canvas Base Dimensions
    const canvasWidth = 1920;
    const canvasHeight = 1080;
    const aspectRatio = "16:9";

    // Overlay height: 30% of canvas height
    const overlayHeight = canvasHeight * 0.30; // 324px

    // Metadata Configuration
    const metadataFontSize = 24;
    const metadataPadding = { top: 10, right: 45, bottom: 10, left: 45 };
    const metadataHeight = metadataFontSize + metadataPadding.top + metadataPadding.bottom + 12; // 56px

    // Gap between Metadata and Quote Area
    const gap = 10;

    // Quote Configuration
    const quotePadding = { top: 10, right: 60, bottom: 10, left: 60 };
    const quoteFontSize = 36;
    const quoteLineHeight = 1.5;
    const linePixelHeight = quoteFontSize * quoteLineHeight; // 54px
    const maxVisibleLines = 4;

    // Quote Box Dimensions (derived)
    const quoteBoxWidth = canvasWidth - (quotePadding.left + quotePadding.right); // 1800px
    const quoteBoxHeight = overlayHeight - metadataHeight - gap - quotePadding.top - quotePadding.bottom; // 238px

    const frame = {
        canvasWidth,
        canvasHeight,
        aspectRatio,
        overlay: {
            height: overlayHeight
        },
        metadata: {
            fontSize: metadataFontSize,
            padding: metadataPadding,
            height: metadataHeight
        },
        gap,
        quote: {
            fontSize: quoteFontSize,
            lineHeight: quoteLineHeight,
            padding: quotePadding,
            linePixelHeight,
            maxVisibleLines
        },
        quoteBox: {
            width: quoteBoxWidth,
            height: quoteBoxHeight
        }
    };

    return frame;
})();

// Export for Node (CommonJS) and Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PresentationFrame };
} else if (typeof window !== 'undefined') {
    window.PresentationFrame = PresentationFrame;
}
