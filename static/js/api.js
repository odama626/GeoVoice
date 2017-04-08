var geovoiceApi = {

  getuser: (user) => {
    return new Promise( (resolve, reject) => {
      fetch('/api/user/'+user, { credentials: 'include' })
      .then( r => { return r.json()})
      .then(r => {
        if (typeof(r.error) != 'undefined') { reject(r); }
          else {
            if (typeof(r.img) != 'undefined') { r.img = '/img/'+r.img; }
            resolve(r);
          }
      }).catch(reject);
    });
  }, // getuser( username) returns usr { name, username, image}

  getself: () => {
    return new Promise( (resolve, reject) => {
      fetch('/api/self', { credentials: 'include' })
      .then( r => {return r.json()})
      .then(r => {
        if (typeof(r.error) != 'undefined') { reject(r); }
          else {
            if (typeof(r.img) != 'undefined') { r.img = '/img/'+r.img; }
            resolve(r);
          }
      }).catch(reject);
    });
  },

  parseLocation: (m) => {
    return { lat: parseFloat(m.lat), lng: parseFloat(m.lng)};
  }
}

function getResource(res) {
  if (!res.startsWith('blob:')) {
    res = '/'+res;
  }
  return res;
}
