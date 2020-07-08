'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkInput = checkInput;
exports.parseCommand = parseCommand;
exports.run = run;
exports.default = pptx2pdf;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('mz/fs');

var _fs2 = _interopRequireDefault(_fs);

var _child_process = require('mz/child_process');

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug2.default)('PPTX2PDF');

function checkInput(inputPath) {
  debug('checkInput(inputPath=' + inputPath + ')');
  return new Promise(function (resolve, reject) {
    var ext = _path2.default.extname(inputPath.toLowerCase());
    var extensions = ['.pdf', '.pptx', '.ppt', '.odp'];
    if (extensions.includes(ext)) return resolve(ext);else return reject('Input file extension must be .pptx, .ppt, .odp and .pdf');
  });
}

function parseCommand(cmd) {
  debug('parseCommand(cmd=' + cmd + ')');
  var _args = cmd.split(' ');
  var _cmd = _args.shift();
  return { _cmd: _cmd, _args: _args };
}

function run(cmd) {
  var dir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '.';

  debug('run(cmd=' + cmd + ')');

  return new Promise(function (resolve, reject) {
    var _parseCommand = parseCommand(cmd),
        _cmd = _parseCommand._cmd,
        _args = _parseCommand._args;

    debug('_cmd: ' + _cmd + ', _args: ' + JSON.stringify(_args));

    var logStream = _fs2.default.createWriteStream(dir + '/pptx2pdf.log', { flags: 'a' });
    logStream.write('\ncommand: ' + cmd + '\n', 'utf8');

    var proc = (0, _child_process.spawn)(_cmd, _args, { detached: false });

    logStream.write('pid: ' + proc.pid + '\n', 'utf8');

    proc.on('error', function (err) {
      debug('child process ' + _cmd + ' got an error: ' + err);
      logStream.write('child process ' + _cmd + ' got an error: ' + err, 'utf8');
      reject(err);
    }).on('close', function (code) {
      var status = code === 0 ? 'SUCCESS' : 'ERROR';
      debug('child process ' + _cmd + ' exited with code: ' + code + ' and status: ' + status);
      logStream.end(_cmd + ' status: ' + status + '\n', 'utf8');
      resolve(code);
    }).stdout.on('data', function (data) {
      logStream.write(data, 'utf8');
    });
  });
}

function pptx2pdf(_ref) {
  var input = _ref.input,
      outputDir = _ref.outputDir,
      filename = _ref.filename,
      target = _ref.target,
      png = _ref.png,
      removePdf = _ref.removePdf,
      libreofficeBin = _ref.libreofficeBin,
      convertBin = _ref.convertBin,
      logDir = _ref.logDir,
      resize = _ref.resize || 2400,
      density = _ref.density || 400;


  debug('pptx2pdf({ input, outputDir, filename, target, png, removePdf, libreofficeBin, convertBin, logDir })');

  var defaultLibreoffice = process.platform === 'darwin' ? '/Applications/LibreOffice.app/Contents/MacOS/soffice' : '/usr/bin/libreoffice';

  var libreoffice = libreofficeBin || defaultLibreoffice;

  var convert = 'convert';

  var inputPath = input || target;
  var baseFilename = _path2.default.basename(inputPath);
  var ext = baseFilename.split('.').pop();
  var outputFile = filename || baseFilename.replace(new RegExp('.' + ext + '$'), '.pdf');
  var outputPng = outputFile.replace(/\.pdf$/, '.png');
  var outputPath = outputDir + '/' + outputFile;
  var cmdPdf = libreoffice + ' --headless --invisible --convert-to pdf --outdir ' + outputDir + ' ' + inputPath;
  // const cmdPng = `${convert} -verbose -limit memory 0 -limit map 0 -resize 1200 -density 200 ${outputPath} ${outputPath.replace(/\.pdf$/, '')}.png`;
  var cmdPng = convert + ' -verbose -resize '+resize+' -density '+density+' ' + outputPath + ' ' + outputPath.replace(/\.pdf$/, '') + '.png';
  // const cmdPdf2Png = `${convert} -verbose -limit memory 0 -limit map 0 -resize 1200 -density 200 ${inputPath} ${outputDir}/${outputPng}`;
  var cmdPdf2Png = convert + ' -verbose -resize '+resize+' -density '+density+' ' + inputPath + ' ' + outputDir + '/' + outputPng;

  return _fs2.default.access(inputPath).then(function () {
    return checkInput(inputPath);
  }).then(function (ext) {

    if (ext === '.pdf') return run(cmdPdf2Png);

    return run(cmdPdf).then(function () {
      if (!png) {
        return _fs2.default.access(outputPath);
      } else {
        return run(cmdPng).then(function () {
          if (removePdf) _fs2.default.unlink(outputPath);
        });
      }
    });
  });
}