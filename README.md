# GeoVoice a place to publically share audio recordings.

![dependency status](https://david-dm.org/omarzion/Geovoice.svg)

- You can add media and mark it on the map

## Roadmap
 - [ ] # Cross device compatibility
 - [x] # CSS animations to give sublte hints on how to use siteData
   - [x] Classic region creation
 - [x] Rework RegionPanel animations
 - [ ] # find out why some videos are choppy on playback
 - [ ] start working on api
   - [x] getuser
   - [x] getself
   - [ ] banner-ad that expands
 - [x] # expand About page
   - [x] # create FAQ
   - [x] # introduction page / video overview of features
 - [ ] # User page
   - [x] allow deletion of markers
   - [ ] # reset password
   - [ ] # email validation on register
   - [x] public user page
   - [x] use username instead of email on markers
   - [x] private sharing of markers
   - [ ] treeview of markers based on region
   - [x] ability to view other users' profile
 - [ ] implement admin features
   - [x] admin page
   - [x] destroy db
   - [ ] pick other users to elevate
   - [ ] tree view of all markers with delete option
 - [ ] Only send Marker information needed
 - [ ] add stylized login error page
 - [ ] add stylized 404 page
 - [x] Groups
```
  person {
     groups: [
       {
         name: <group name>
         access: owner or can edit or can view
       }
     ]
   }

   region {
     ingroup: <group name>
     description: asfas fads fasdf
     access: public or private

   }

   group url: /?g=groupname
 ```

## Known Working
 - Linux
  - [x] Chrome
  - [x] Firefox
 - Android
  - [x] Chrome
  - [x] Firefox (laggy after sound upload)
 - Windows
  - [x] Chrome
  - [ ] Safari (too old of a version)
  - [x] Firefox


## Interesting use cases
 - Farmer's marker
 - open house
 - university
 - group meetups
 - landmarks

## How to get started:
1. Fork or download repo
2. To install dependencies
  - if you don't have npm, or Node.js, you can get it from [here](https://nodejs.org/)
  ```bash
  npm install
  ```
3. Generate an SSH certificate
  - There is a pretty good tutorial [here](https://help.github.com/articles/generating-an-ssh-key/)
4. set file locations for key and cert in app.js
  - Line 16
5. Start server.
  - If installed from website
  ```bash
  node app.js
  ```
  - if installed with apt-get
  ```bash
  nodejs app.js
  ````
6. browse to https://{server_ip}:5000
  - Replace {server_ip} with the ip address of your server
  - If running locally, use 127.0.0.1
7. Profit.
