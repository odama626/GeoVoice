module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "globals": {
      "$": false,
      "jquery": false,
      "map": false,
      "currently_logged_in": false,
      "ENABLE_REGIONS": false,

      // Global functions
      "getLocation": false,
      "getBounds": false,
      "showDialog": false,  // Create Modal Dialog
      "panToPromise": false, // Pan map promise

      // "Classes"
      "regionUi": false,
      "regions": false,
      "markers": false,
      "ui": false,
      "sound": false,
      "video": false,


      // external "Classes"
        // Google
        "google": false,
        "Marker": false,

        //Map Icons
        "SQUARE_PIN": false,
        "ROUTE": false,
        "SHIELD": false,
        "SQUARE_ROUNDED": false,
        "SQUARE": false,
        "MAP_PIN": false,
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "warn",
            2
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ]
    }
};
