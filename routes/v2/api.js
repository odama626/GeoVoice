const router = require('express').Router();
const bodyParser = require('body-parser');
const cors = require('cors');

const { sanitization } = require('./utils');

// models
const userRouter = require('./user');
const markerRouter = require('./marker');
const region = require('./region');
const regionCollection = require('./regionCollection');




router.use(cors());
router.use(bodyParser.json());
router.use(sanitization);


// sub-routes
router.use('/user', userRouter);
router.use('/marker', markerRouter);
router.use('/region', region);
router.use('/regioncollection', regionCollection);

// Sanitize everything for MongoDB




module.exports = router;
