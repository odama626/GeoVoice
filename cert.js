var fs = require('fs');


var cert = {
options:
  {
    key: fs.readFileSync('/etc/letsencrypt/live/geovoice.elev8ted.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/geovoice.elev8ted.com/fullchain.pem')
  }
};

exports.cert = cert;
