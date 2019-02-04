const router = require('express').Router();
const { auth } = require('./utils');

const Region = require('../../models/region');
const Group = require('../../models/group');

// router.get()



router.get('/all', auth, async (req, res) => {
  let groups = req.user.groups;
  groups.push(null);
  let publicGroups = await Group.find({ access: 'public' });
  console.log(publicGroups.length);
  // Region.find({ })
});




module.exports = router;
