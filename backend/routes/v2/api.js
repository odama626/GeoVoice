const router = require('express').Router();
const bodyParser = require('body-parser');
const cors = require('cors');

const { sanitization } = require('./utils');

// models
const userRouter = require('./user');
const markerRouter = require('./marker');
const region = require('./region');
const group = require('./group');




router.use(cors());
router.use(bodyParser.json());
router.use(sanitization);


// sub-routes
router.use('/user', userRouter);
router.use('/marker', markerRouter);
router.use('/region', region);
router.use('/group', group);

// Sanitize everything for MongoDB




module.exports = router;
