module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "globals": {
      "$": false,
      "jquery": false,
      "ui": false,
      "regions": false,
      "currently_logged_in": false,
      "getLocation": false
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
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
