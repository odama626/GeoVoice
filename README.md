# GeoVoice a place to publically share audio recordings.

![dependency status](https://david-dm.org/omarzion/Geovoice.svg)

- You can add media and mark it on the map

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

## Moving forward
 - [ ] add Admin boolean for users
 - [ ] Only send Marker information needed
 - [ ] add stylized login error page
 - [ ] add stylized 404 page
 - [ ] Add live irc style message panel for logged in users? :|
 - [ ] expand About page

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
