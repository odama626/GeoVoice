# GeoVoice is a place to publically share audio recordings.

- You can add individual points
- Or you can add recordings to public places (domains) such as libraries, museums etc..

## How to get started:
1. Fork or download repo
2. To install dependencies
```bash
npm install
```
--- if you don't have npm, or Node.js, you can get it from [here](https://nodejs.org/)
3. Generate an SSH certificate
--- There is a pretty good tutorial [here](https://help.github.com/articles/generating-an-ssh-key/)
4. set file locations for key and cert in app.js
--- Line 16
5. Start server.
```bash
node app.js
```
--- Or if installed with apt-get
```bash
nodejs app.js
````
6. browse to https://{server_ip}:5000
--- Replace {server_ip} with the ip address of your server
--- If running locally, use 127.0.0.1
7. Profit.


