const { PDFDocument, rgb, degrees } = require('pdf-lib');

exports.addWatermarkToPdf = async (fileBuffer, watermarkText = 'Archivia Protected') => {
  try {
    // Load the PDF from the buffer
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const pages = pdfDoc.getPages();

    // Loop through all pages to add the watermark
    pages.forEach((page) => {
      const { width, height } = page.getSize();
      
      // Draw text diagonally across the center
      page.drawText(watermarkText, {
        x: width / 2 - 150, // Approximate centering adjustment
        y: height / 2,
        size: 50,
        color: rgb(0.6, 0.6, 0.6), // Light Gray
        opacity: 0.4,              // Semi-transparent
        rotate: degrees(45),       // Diagonal
      });
    });

    // Save the modified PDF and return as a Buffer
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);

  } catch (error) {
    console.error('Watermarking failed:', error);
    // Return original buffer if watermarking fails to prevent upload blocking
    return fileBuffer; 
  }
};