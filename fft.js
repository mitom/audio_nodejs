const ft = require('fourier-transform')
    , _ = require('lodash')
    ;

module.exports = {
    calculate: function (data, zip, trim, scale, bufferSize) {
        // if (data.length == 1) {
        //   console.log('single')
        //   data = _.map(data[0], (x) => {
        //     return +x
        //   });
        // } else if (data.length == 2) {
        //
        //   data = _.zipWith(data[0], data[1], function(a, b) {
        //     return (+a) + (+b);
        //   });
        // } else {
        //   throw new Exception("Too many channels.")
        // }
        data = _.flatten(data);

        // console.log(scale)
        let fftd = ft(data);
        fftd = this.trim(fftd, trim, bufferSize)
        fftd = _.map(fftd, (x) => {
            return x
        });

        // console.log(fftd)
        return this.zip(fftd, zip)
    },

    zip: function (data, limit) {
        let len = data.length;
        let ratio = parseInt(len / (limit));
        return _.map(_.chunk(data, ratio), _.mean)
    },

    trim: function (data, amount, bufferSize) {
        let i = parseInt((bufferSize / 2) / amount);

        return data.slice(0, i)
    }
}
