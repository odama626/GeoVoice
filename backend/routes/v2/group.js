const router = require('express').Router();
const { auth } = require('./utils');

const group = require('../../models/group');


// delete region collection
// router.delete('/:name', auth, (req, res) => {
//   const { name } = req.params;
//   Collection.deleteOne
// });

module.exports = router;
