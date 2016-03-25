'use strict';

const Promise = require('bluebird');

function isErrorInFirstArg(isFuncs, arr, callback) {
    if (!Array.isArray(arr)) {
        callback(new TypeError('First argument should be an array'));
        return true;
    } else if (!arr.length) {
        callback(new RangeError('Length of first argument must be more than 0'));
        return true;
    }

    if (!isFuncs) {
        return false;
    }

    for (let item of arr) {
        if (!(item instanceof Function)) {
            callback(new TypeError('All values of first argument (array) should be a function'));
            return true;
        }
    }
    return false;
}

exports.serial = function (funcArr, callback) {
    if (isErrorInFirstArg(true, funcArr, callback)) {
        return;
    }

    funcArr.shift()(next);

    function next(err, data) {
        if (err) {
            callback(err);
        } else if (funcArr.length) {
            funcArr.shift()(data, next);
        } else {
            callback(null, data);
        }
    }
};

exports.parallel = function (funcArr, limit, callback) {
    if (typeof limit === 'function') {
        callback = callback ? callback : limit;
        limit = funcArr.length;
    }

    if (isErrorInFirstArg(true, funcArr, callback)) {
        return;
    } else if (typeof limit !== 'function' && typeof limit !== 'number') {
        return callback(new TypeError('Incorrect type of 2nd arg. Should be a function ' +
            'or a number'));
    } else if (typeof limit === 'number' && limit <= 0) {
        return callback(new RangeError('Limit must be more than 0'));
    }

    var countRunningFuncs = 0;

    function getPromise(func) {
        return new Promise((resolve, reject) => {
            var timer = setInterval(() => {
                if (countRunningFuncs < limit) {
                    countRunningFuncs++;
                    func((err, data) => {
                        countRunningFuncs--;
                        err ? reject(err) : resolve(data);
                    });
                    clearInterval(timer);
                }
            }, 10);
        });
    }

    Promise.all(funcArr.map(getPromise))
        .then(results => callback(null, results), callback);
};

exports.map = function (valueArr, func, callback) {
    if (isErrorInFirstArg(false, valueArr, callback)) {
        return;
    } else if (!(func instanceof Function)) {
        return callback(new TypeError('Incorrect type of 2nd arg. Should be a function'));
    }

    function getPromise(value) {
        return new Promise((resolve, reject) => {
            func(value, (err, data) => {
                err ? reject(err) : resolve(data);
            });
        });
    }

    Promise.all(valueArr.map(getPromise))
        .then(results => callback(null, results), callback);
};

exports.makeAsync = function (func) {
    if (!(func instanceof Function)) {
        return new TypeError('Incorrect type of 2nd arg. Should be a function');
    }
    return function () {
        let args = [].slice.call(arguments, 0);
        const callback = args.splice(-1, 1)[0];
        let result;
        let error = null;

        try {
            result = func.apply(null, args);
        } catch (e) {
            error = e;
        }
        setTimeout(() => {
            callback(error, result);
        }, 0);
    };
};

