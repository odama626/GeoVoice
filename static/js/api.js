var geovoiceApi = {

  getuser: (user) => {
    return new Promise( (resolve, reject) => {
      fetch('/api/user/'+user, { credentials: 'include' })
      .then(geovoiceApi.fetchOk)
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
  },

  fetchOk: (response) => {
    if (response.ok) {
      return response.json();
    }
    throw response;
  },

  checkNameAvailability: (type, query) => {
    var data = new FormData();
    data.append('query', query);
    var chain = fetch(`/check_name_availability?t=${type}`, {
      method: 'POST',
      body: data
    }).then(geovoiceApi.fetchOk)
    .then( e => { if (e.available) { return e;} throw e; });
    return chain;
  },

  get: (type, name) => {
    var data = new FormData();
    data.append('query', name);
    var chain = fetch(`/get?t=${type}`, {
      credentials: 'include',
      method: 'POST',
      body: data
    }).then(geovoiceApi.fetchOk)
    .then( e => { if (e.error) { throw e;} return e;})
    return chain;
  },

  addUserToGroup: (username, groupName, access) => {
    var data = new FormData();
    data.append('user', username);
    data.append('group', groupName);
    data.append('access', access);
    var chain = fetch('/group/add_user', {
      credentials: 'include',
      method: 'POST',
      body: data
    }).then(geovoiceApi.fetchOk)
    .then( e => { if (e.error) {throw e;} return e;});
    return chain;
  }
}

url = {};

url.rootIfNeeded = (res) => {
  if (res.startsWith('blob:') || res.startsWith('http')) {
      return res;
  }
  return '/'+res;
}

url.getQueryParams = (s = window.location.href) => {
  return s.slice(s.indexOf('?'));
}


// Google analytics
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-81658884-2', 'auto');
ga('send', 'pageview');
