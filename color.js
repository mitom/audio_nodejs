let config = require('./config.js')
    , _ = require('lodash')
    ;
module.exports = function (data) {
    let scale = config.get('saturation');
    let area = {
        'r': config.get('r_area'),
        'g': config.get('g_area'),
        'b': config.get('b_area')
    };

    let count = {
        'r': 0,
        'g': 0,
        'b': 0
    };

    let max = {
        'r': 0,
        'g': 0,
        'b': 0
    };

    let color = {
        'r': 0,
        'g': 0,
        'b': 0
    };

    for (let n = 0; n < data.length; n++) {
        let pos = n / data.length;
        let val = data[n];
        for (let c of ['r', 'g', 'b']) {
            if (pos >= area[c][0] && pos <= area[c][1]) {
                if (val > max[c]) max[c] = val;
                val = val * area[c][2];
                color[c] += val;
                count[c]++
            }
        }
    }
    let tmax = _.max([max.r, max.g, max.b]);

    for (let c of ['r', 'g', 'b']) {
        if (color[c]) color[c] = 255 * color[c] / count[c] / tmax;
        if (color[c] > 255) color[c] = 255;
        if (color[c] < 0) color[c] = 0
    }
    let alpha = tmax / scale * 100;
    if (alpha > 100) alpha = 100;
    if (alpha < 0) alpha = 0;

    return {
        'r': Math.round(color.r),
        'g': Math.round(color.g),
        'b': Math.round(color.b),
        'alpha': Math.round(alpha)
    }
};