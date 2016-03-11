'use strict';

const flow = require('../src/flow.js');
const should = require('chai').should();
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

function errFunc1(next) {
    fs.readdir(join(__dirname, '..', 'slowpok'), (err, files) => {
        next(err, files);
    });
}


describe('flow', function () {
    describe('.serial', function () {
        it('should return error, first arg is not an array', function (done) {
            flow.serial(func1, (err, res) => {
                should.exist(err);
                should.not.exist(res);
                done();
            });
        });

        it('should return error, array is empty', function (done) {
            flow.serial([], (err, res) => {
                should.exist(err);
                should.not.exist(res);
                done();
            });
        });

        it('should return error, one item of array is not a func', function (done) {
            flow.serial([func1, 59, func2], (err, res) => {
                should.exist(err);
                should.not.exist(res);
                done();
            });
        });

        it('should return error, one of function is incorrect', function (done) {
            flow.serial([errFunc1, func2], (err, res) => {
                should.exist(err);
                should.not.exist(res);
                done();
            });
        });

        it('should return string', function (done) {
            flow.serial([func1, func2], (err, res) => {
                should.not.exist(err);
                should.exist(res);
                res.should.be.a('string');
                done();
            });
        });

        it('should called functions one by one', function (done) {
            let spy1 = sinon.spy(func1);
            let spy2 = sinon.spy(func2);
            flow.serial([spy1, spy2], (err, res) => {
                should.not.exist(err);
                spy1.calledBefore(spy2).should.be.true;
                spy1.calledOnce.should.be.true;
                spy2.calledOnce.should.be.true;
                done();
            });
        });
    });

    describe('.parallel', function () {
        it('should return error, first arg is not an array', function (done) {
            flow.parallel(func1, (err, res) => {
                should.exist(err);
                should.not.exist(res);
                done();
            });
        });

        it('should return error, array is empty', function (done) {
            flow.parallel([], (err, res) => {
                should.exist(err);
                should.not.exist(res);
                done();
            });
        });

        it('should return error, one item of array is not a func', function (done) {
            flow.parallel([func1, 59, func2], (err, res) => {
                should.exist(err);
                should.not.exist(res);
                done();
            });
        });

        it('should return error, one of function is incorrect', function (done) {
            flow.parallel([func1, errFunc1], (err, res) => {
                should.exist(err);
                should.not.exist(res);
                done();
            });
        });

        it('should return error, 2nd arg must be func or number', function (done) {
            flow.parallel([func1, func2], 'err', (err, res) => {
                should.exist(err);
                should.not.exist(res);
                done();
            });
        });

        it('should return error, 2nd arg must be more than 0', function (done) {
            flow.parallel([func1, func2], 0, (err, res) => {
                should.exist(err);
                should.not.exist(res);
                done();
            });
        });

        it('should return array with length 2', function (done) {
            flow.parallel([func1, func2], (err, res) => {
                should.not.exist(err);
                should.exist(res);
                res.should.be.an('array').with.length(2);
                done();
            });
        });

        it('should called functions in parallel (test on time execution)', function (done) {
            let spy1 = sinon.spy(func1);
            let spy2 = sinon.spy(func2);
            let time = process.hrtime();
            flow.parallel([spy1, spy2], (err, res) => {
                time = process.hrtime(time);
                const timeExec = Math.round((time[0] + time[1] / 1e9) * 10) / 10;
                should.not.exist(err);
                spy1.calledOnce.should.be.true;
                spy2.calledOnce.should.be.true;
                timeExec.should.equal(1);
                done();
            });
        });

        it('should return array with length 3 (with limit)', function (done) {
            flow.parallel([func1, func2, func3], 1, (err, res) => {
                should.not.exist(err);
                should.exist(res);
                res.should.be.an('array').with.length(3);
                done();
            });
        });

        it('should called functions one by one with limit = 1 ' +
            '(test on time execution)', function (done) {
            this.timeout(4000);
            let spy1 = sinon.spy(func1);
            let spy2 = sinon.spy(func2);
            let spy3 = sinon.spy(func3);
            let time = process.hrtime();
            flow.parallel([spy1, spy2, spy3], 1, (err, res) => {
                time = process.hrtime(time);
                const timeExec = Math.round((time[0] + time[1] / 1e9) * 10) / 10;
                should.not.exist(err);
                spy1.calledOnce.should.be.true;
                spy2.calledOnce.should.be.true;
                spy3.calledOnce.should.be.true;
                timeExec.should.equal(3);
                done();
            });
        });
    });

    describe('.map', function () {
        const files = fs.readdirSync(join(__dirname, '..'))
            .map(item => join(__dirname, '..', item));

        it('should return error, 1st arg is not an array', function (done) {
            flow.map('string', func1, (err, res) => {
                should.exist(err);
                should.not.exist(res);
                done();
            });
        });

        it('should return error, array is empty', function (done) {
            flow.map([], func1, (err, res) => {
                should.exist(err);
                should.not.exist(res);
                done();
            });
        });

        it('should return error, 2nd arg is not a function', function (done) {
            flow.map(files, 13, (err, res) => {
                should.exist(err);
                should.not.exist(res);
                done();
            });
        });

        it('should return array', function (done) {
            flow.map(files, fs.stat, (err, res) => {
                should.not.exist(err);
                should.exist(res);
                res.should.be.an('array');
                done();
            });
        });

        it('should called function with each value', function (done) {
            let spy = sinon.spy(fs.stat);
            flow.map(files, spy, (err, res) => {
                should.not.exist(err);
                spy.callCount.should.equal(files.length);
                files.forEach((item, i) => {
                    spy.getCall(i).args[0].should.be.equal(item);
                });
                done();
            });
        });

        it('should called function with all values in parallel ' +
            '(test on time execution)', function (done) {
            let spy = sinon.spy(fs.stat);
            let time = process.hrtime();
            flow.map(files, spy, (err, res) => {
                time = process.hrtime(time);
                const timeExec = Math.round((time[0] + time[1] / 1e9) * 10) / 10;
                should.not.exist(err);
                timeExec.should.equal(1);
                done();
            });
        });
    });

    describe('.makeAsync', function () {
        function concat(str, num) {
            return str + num;
        }

        it('should return error, 1st arg is not a function', function () {
            const errConcat = flow.makeAsync({});
            errConcat.should.be.an('error');
        });

        it('should return string', function (done) {
            concat = flow.makeAsync(concat);
            concat('ololo', 15, (err, res) => {
                should.not.exist(err);
                should.exist(res);
                res.should.be.a('string');
                done();
            });
        });
    });
});
