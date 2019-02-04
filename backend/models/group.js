var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const Group = new Schema({
  owner: String // Account username
  ,name: String
  ,regions: [String]
  ,visibility: {type: String, default: 'public'} // public, hasLink, or private
})

module.exports = mongoose.model('Group', Group);
