const multer = require('multer');


const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'image/x-icon' || file.mimetype === 'image/vnd.microsoft.icon') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are accepted.'), false);
  }
};


const docFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF documents are accepted.'), false);
  }
};


const storage = multer.memoryStorage();

exports.upload = multer({ 
  storage: storage,
  fileFilter: docFileFilter
});

exports.uploadIcon = multer({ 
  storage: storage,
  fileFilter: imageFileFilter
});

exports.uploadBgImage = multer({ 
  storage: storage,
  fileFilter: imageFileFilter
});

exports.uploadBrandIcon = multer({ 
  storage: storage,
  fileFilter: imageFileFilter
});