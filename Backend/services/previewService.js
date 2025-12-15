const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const { PDFDocument } = require('pdf-lib'); 

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.generatePreviews = async (pdfBuffer, filename) => {
  let bufferToUpload = pdfBuffer; 
  let detectedPages = 0;

  
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    detectedPages = pdfDoc.getPageCount();
    console.log(`[Preview Service] Original PDF has ${detectedPages} pages.`);

    
    if (detectedPages > 4) {
        console.log(`[Preview Service] Trimming PDF to first 4 pages to reduce upload size...`);
        
        const subDoc = await PDFDocument.create();
        
        const pagesToCopy = await subDoc.copyPages(pdfDoc, [0, 1, 2, 3]);
        pagesToCopy.forEach(page => subDoc.addPage(page));
        
        const pdfBytes = await subDoc.save();
        bufferToUpload = Buffer.from(pdfBytes); 
        
        console.log(`[Preview Service] Optimized PDF size: ${(bufferToUpload.length / 1024 / 1024).toFixed(2)} MB`);
    }
  } catch (err) {
    console.error("[Preview Service] PDF manipulation failed (using original file):", err.message);
  }

  return new Promise((resolve, reject) => {
    const publicId = `previews/${filename.replace(/\.[^/.]+$/, "")}`;

    
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        resource_type: 'image', 
        public_id: publicId
      },
      (error, result) => {
        if (error) {
            console.error("Cloudinary Upload Error:", error);
            
            return resolve([]); 
        }

        
        const totalPages = result.pages || detectedPages || 1;
        const limit = Math.min(totalPages, 4);
        
        const previewUrls = [];

        
        for (let i = 1; i <= limit; i++) {
          const isTeaserPage = (i === 4);
          const transformation = isTeaserPage ? [{ effect: "blur:1500" }] : [];

          const url = cloudinary.url(result.public_id, {
            page: i,
            resource_type: 'image',
            format: 'png',
            transformation: transformation,
            secure: true 
          });
          
          previewUrls.push(url);
        }

        resolve(previewUrls);
      }
    );

    
    streamifier.createReadStream(bufferToUpload).pipe(uploadStream);
  });
};