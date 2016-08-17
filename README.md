# GeoVoice a place to publically share audio recordings.

- You can add individual points
- Or you can add recordings to public places (domains) such as libraries, museums etc..

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

## TODO
 - [ ] Use [Map Spiderfier](https://github.com/jawj/OverlappingMarkerSpiderfier)
 - [ ] Convert audio to mp3 before upload with [libmp3lame](https://github.com/akrennmair/libmp3lame-js)
 - [ ] Only send Marker information needed
 - [ ] Make adding markers to domains more intuitive/dynamic
 - [ ] Implement User login
 - [ ] Require User to be logged in to add recording/domain
 - [ ] Show username on posted markers

## Known Bugs
 - [ ] Sometimes adding a sound to a domain adds duplicates

