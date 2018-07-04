const FixedArray = require('fixed-array')
    , config = require('./config.js')
    , logger = require('winston')
    ;
let hlength = 20;
module.exports = {
    history: new FixedArray(hlength),
    _lastclap: 0,
    _lastdouble: 0,

    add: function (value) {
        let claps = 0;
        if (this.is_measurable()) {
            let min_vol = 25 * (10 - Math.log10(config.get('scale')));
            if (value * 0.3 > this.history.mean() && value > min_vol) {
                let now = Math.floor(Date.now());
                // Make sure at least 200ms has passed since the last clap
                if (this._lastclap + 200 < now && this._lastdouble + 1000 < now) {
                    // check if less than 500ms has passed since the last clap
                    if (this._lastclap + 500 > now) {
                        this._lastdouble = now;
                        claps = 2;
                        logger.log('debug', 'Double clap')
                    } else {
                        claps = 1;
                        value = value * 0.7;
                        logger.log('debug', 'Single clap')
                    }
                    this._lastclap = now
                }
            }
        }
        this.history.push(value);

        return claps
    },

    is_measurable: function () {
        return hlength === this.history.length()
    }
};
