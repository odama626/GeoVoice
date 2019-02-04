const mongoose = require('mongoose');

const Marker = new mongoose.Schema({
  type: String,
  creator: String,
  date: { type: Date, default: Date.now},
  lat: Number,
  lng: Number,
  media: String,
  region: String,
  tags: [String],
}, { strict: false});

module.exports = mongoose.model('Marker', Marker);
