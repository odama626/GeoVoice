const router = require('express').Router();
const { auth, maybe } = require('./utils');

const Marker = require('../../models/marker');


// create marker
router.post('/create', auth, (req, res) => {
  const creator = req.user.username;
  const { region } = req.body;
  let marker = {
    ...req.body,
    creator
  }
  marker.media = maybe('files.0.filename', req);

  Marker.findOneAndUpdate({ name: region }, { $push: marker }, { upsert: true }, (error, marker) => {
    if (error) res.json({ error });
    res.json({ marker });
  })
});

// delete marker
router.post('/delete', auth, (req, res) => {
  const { region, media } = req.body;
  const { username } = req.user;
  Marker.findOneAndUpdate(
    { name: region, 'markers.media': media, 'markers.creator': username},
    { $pull: { markers: { media }}},
    (error, marker) => {
      if (error) res.json({ error });
      res.json({ marker });
    }
  )
});

// get all visible markers
// router.get('/', (req, res) => {

// })






module.exports = router;
