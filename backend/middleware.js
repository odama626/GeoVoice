const	multer = require('multer');
const fs = require('fs');

const destination = (req, file, cb) => {
  if (file.originalname.endsWith('.png')) {
    cb(null, './uploads/img/');
  } else {
    cb(null, './uploads/');
  }
}

const filename = (req, file, cb) => {
  if (file.originalname.endsWith('.webm')) {
    cb(null,Date.now()+'.webm');
  } else if (file.originalname.endsWith('.wav')) {
    cb(null,Date.now()+'.wav');
  } else if (file.originalname.endsWith('.png')) {
    const filename = req.user.username+'.png';
    if (fs.existsSync('./uploads/img/'+filename)) {
      fs.unlinkSync('./uploads/img/'+filename);
    }
    cb(null, filename);
  }
}

// setup parsing of file uploads
const storage = multer({ storage: multer.diskStorage({ destination, filename }) }).any();

module.exports = {
  storage,
}
