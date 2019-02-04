const mongoose = require('mongoose');
const Marker = require('./marker');

const Region = new mongoose.Schema({
  type: String,
  name: String,
  lat: Number,
  lng: Number,
  color: String,
  markers: [Marker.schema]
}, { strict: false});

module.exports = mongoose.model('Region', Region);
