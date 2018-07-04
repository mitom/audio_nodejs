const fs = require('fs')
    , jsonfile = require('jsonfile')
    , _ = require('lodash')
    ;

let file = 'config.json';

module.exports = {
    _default: {
        'sample_size': 64,
        'r_area': [0.3, 0.6, 3],
        'g_area': [0, 0.3, 1.4],
        'b_area': [0.6, 1, 4],
        'saturation': 30,
        'trim': 10,
        'scale': 1,
        'speed': 10,
        'active': true,
        'clapper': true
    },

    _data: {},

    reset: function () {
        this._data = this._default;
    },

    get: function (key) {
        if (!key) return this._data;

        return this._data[key]
    },

    set: function (config) {
        this._data = _.merge(this._data, config)
    },

    load: function () {
        try {
            this._data = jsonfile.readFileSync(file)
        } catch (e) {
            this.reset()
        }
    },

    save: function () {
        jsonfile.writeFileSync(file, this._data)
    }
};
