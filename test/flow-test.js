'use strict';

const flow = require('../src/flow.js');
const expect = require('chai').expect;
const sinon = require('sinon');
const join = require('path').join;
const fs = require('fs');

function func1(next) {
    fs.readdir(join(__dirname, '..'), (err, files) => {
        next(err, files);
    });
}

function func2(result, next) {
    if (typeof result === 'function' && !next) {
        next = result;
    }
    result = Array.isArray(result) && result.length ? result[0] : 'package.json';
    fs.readFile(join(__dirname, '..', result), 'utf8', (err, data) => {
        next(err, data);
    });
}

function func3(next) {
    fs.stat(join(__dirname), (err, stats) => {
        next(err, stats);
    });
}

function stubTimeout(callback) {
    setTimeout(() => {
        callback(null, 1);
    }, 10000);
}

function stubTimeout2(value, callback) {
    setTimeout(() => {
        callback(null, value);
    }, 10000);
}

function errFunc1(next) {
    fs.readdir(join(__dirname, '..', 'slowpok'), (err, files) => {
        next(err, files);
    });
}


describe('flow', function () {
    describe('.serial', function () {
        it('should return error, first arg is not an array', function (done) {
            flow.serial(func1, (err, res) => {
                expect(err).to.exist;
                expect(res).to.not.exist;
                done();
            });
        });

        it('should return error, array is empty', function (done) {
            flow.serial([], (err, res) => {
                expect(err).to.exist;
                expect(res).to.not.exist;
                done();
            });
        });

        it('should return error, one item of array is not a func', function (done) {
            flow.serial([func1, 59, func2], (err, res) => {
                expect(err).to.exist;
                expect(res).to.not.exist;
                done();
            });
        });

        it('should return error, one of function is incorrect', function (done) {
            flow.serial([errFunc1, func2], (err, res) => {
                expect(err).to.exist;
                expect(res).to.not.exist;
                done();
            });
        });

        it('should return string', function (done) {
            flow.serial([func1, func2], (err, res) => {
                expect(err).to.not.exist;
                expect(res).to.exist;
                expect(res).to.be.a('string');
                done();
            });
        });

        it('should called functions one by one', function (done) {
            let spy1 = sinon.spy(func1);
            let spy2 = sinon.spy(func2);
            flow.serial([spy1, spy2], (err, res) => {
                expect(err).to.not.exist;
                expect(spy1.calledBefore(spy2)).to.be.true;
                expect(spy1.calledOnce).to.be.true;
                expect(spy2.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('.parallel', function () {
        it('should return error, first arg is not an array', function (done) {
            flow.parallel(func1, (err, res) => {
                expect(err).to.exist;
                expect(res).to.not.exist;
                done();
            });
        });

        it('should return error, array is empty', function (done) {
            flow.parallel([], (err, res) => {
                expect(err).to.exist;
                expect(res).to.not.exist;
                done();
            });
        });

        it('should return error, one item of array is not a func', function (done) {
            flow.parallel([func1, 59, func2], (err, res) => {
                expect(err).to.exist;
                expect(res).to.not.exist;
                done();
            });
        });

        it('should return error, one of function is incorrect', function (done) {
            flow.parallel([func1, errFunc1], (err, res) => {
                expect(err).to.exist;
                expect(res).to.not.exist;
                done();
            });
        });

        it('should return error, 2nd arg must be func or number', function (done) {
            flow.parallel([func1, func2], 'err', (err, res) => {
                expect(err).to.exist;
                expect(res).to.not.exist;
                done();
            });
        });

        it('should return error, 2nd arg must be more than 0', function (done) {
            flow.parallel([func1, func2], 0, (err, res) => {
                expect(err).to.exist;
                expect(res).to.not.exist;
                done();
            });
        });

        it('should return array with length 2', function (done) {
            flow.parallel([func1, func2], (err, res) => {
                expect(err).to.not.exist;
                expect(res).to.exist;
                expect(res).to.be.an('array').with.length(2);
                done();
            });
        });

        it('should called functions in parallel (test on time execution)', function (done) {
            let spy = sinon.spy(stubTimeout);
            let clock = sinon.useFakeTimers();

            flow.parallel([spy, spy], (err, res) => {});

            clock.tick(10000);
            expect(spy.callCount).to.equal(2);
            clock.restore();
            done();
        });

        it('should return array with length 3 (with limit)', function (done) {
            flow.parallel([func1, func2, func3], 1, (err, res) => {
                expect(err).to.not.exist;
                expect(res).to.exist;
                expect(res).to.be.an('array').with.length(3);
                done();
            });
        });

        it('should called functions one by one with limit = 1 ' +
            '(test on time execution)', function (done) {
            let spy = sinon.spy(stubTimeout);
            let clock = sinon.useFakeTimers();

            flow.parallel([spy, spy, spy], 1, (err, res) => {});

            clock.tick(10000);
            expect(spy.callCount).to.equal(1);
            clock.tick(10000);
            expect(spy.callCount).to.equal(2);
            clock.tick(10000);
            expect(spy.callCount).to.equal(3);
            clock.restore();
            done();
        });
    });

    describe('.map', function () {
        const files = fs.readdirSync(join(__dirname, '..'))
            .map(item => join(__dirname, '..', item));

        it('should return error, 1st arg is not an array', function (done) {
            flow.map('string', func1, (err, res) => {
                expect(err).to.exist;
                expect(res).to.not.exist;
                done();
            });
        });

        it('should return error, array is empty', function (done) {
            flow.map([], func1, (err, res) => {
                expect(err).to.exist;
                expect(res).to.not.exist;
                done();
            });
        });

        it('should return error, 2nd arg is not a function', function (done) {
            flow.map(files, 13, (err, res) => {
                expect(err).to.exist;
                expect(res).to.not.exist;
                done();
            });
        });

        it('should return array', function (done) {
            flow.map(files, fs.stat, (err, res) => {
                expect(err).to.not.exist;
                expect(res).to.exist;
                expect(res).to.be.an('array');
                done();
            });
        });

        it('should called function with each value', function (done) {
            let spy = sinon.spy(fs.stat);
            flow.map(files, spy, (err, res) => {
                expect(err).to.not.exist;
                expect(spy.callCount).to.equal(files.length);
                files.forEach((item, i) => {
                    expect(spy.getCall(i).args[0]).to.equal(item);
                });
                done();
            });
        });

        it('should called function with all values in parallel ' +
            '(test on time execution)', function (done) {
            let spy = sinon.spy(stubTimeout2);
            let clock = sinon.useFakeTimers();

            flow.map(files, spy, (err, res) => {});

            clock.tick(10000);
            clock.restore();
            expect(spy.callCount).to.equal(files.length);
            done();
        });
    });

    describe('.makeAsync', function () {
        function concat(str, num) {
            return str + num;
        }

        it('should return error, 1st arg is not a function', function () {
            const errConcat = flow.makeAsync({});
            expect(errConcat).to.be.an('error');
        });

        it('should return string', function (done) {
            concat = flow.makeAsync(concat);
            concat('ololo', 15, (err, res) => {
                expect(err).to.not.exist;
                expect(res).to.exist;
                expect(res).to.be.a('string');
                done();
            });
        });
    });
});
