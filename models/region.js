var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Marker = new Schema({
  type: String,
  creator: String,
  date: { type: Date, default: Date.now},
  lat: Number,
  lng: Number,
  media: String,
  region: String,
  tags: [String],
}, { strict: false});

var Region = new Schema({
  type: String,
  name: String,
  lat: Number,
  lng: Number,
  color: String,
  markers: [Marker]
}, { strict: false});
