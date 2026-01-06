const { PDFDocument, rgb, degrees } = require('pdf-lib');

exports.addWatermarkToPdf = async (fileBuffer, watermarkText = 'Archivia Protected') => {
  try {
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const pages = pdfDoc.getPages();

    pages.forEach((page) => {
      const { width, height } = page.getSize();
      
      page.drawText(watermarkText, {
        x: width / 2 - 150, 
        y: height / 2,
        size: 50,
        color: rgb(0.6, 0.6, 0.6), 
        opacity: 0.4,              
        rotate: degrees(45),      
      });
    });

 
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);

  } catch (error) {
    console.error('Watermarking failed:', error);
    return fileBuffer; 
  }
};