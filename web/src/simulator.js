/*
 *  shell~$ browserify src/simulator.js --debug --s simulator -o dist/simulator.js
 */

const cc = require('../../src/lang.js');
const utils = require('../../src/utils.js');
const ver = require('../../src/ver.js');

module.exports = {
  cc: cc,
  utils: utils,
  Verifier: ver
};
