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
 - [x] Use [Map Spiderfier](https://github.com/jawj/OverlappingMarkerSpiderfier)
 - [x] Convert media to mp3 before upload using [web-audio-recorder](https://github.com/higuma/web-audio-recorder-js/blob/gh-pages/js/RecorderDemo.js)
 - [x] geofence regions with polygons
 - [x] full custimization of region markers
 - [x] add pause/resume on marker fetch to save bandwidth
 - [ ] test and merge to start major code refactors
 - [ ] reflow to make public markers use region 'null' and streamline marker subgroup viewing
 - [ ] Only send Marker information needed
 - [ ] Make adding markers to domains more intuitive/dynamic
 - [ ] Implement User login
 - [ ] Require User to be logged in to add recording/domain
 - [ ] Show username on posted markers

