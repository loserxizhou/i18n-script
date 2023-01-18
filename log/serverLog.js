const log4js = require('log4js');
const config = global.config;
log4js.configure(__dirname + '/log_config.json');
let log_error = log4js.getLogger('error'),
    log_i18n = log4js.getLogger('i18n')
let isdebugger = true;

function addLog(data, type) {
    if (!isdebugger) {
        return;
    }
    switch (type) {
        case 'i18n':
            log_i18n.trace(data);
            break;
        default:
            log_error.trace(data);
            break;
    }
};
module.exports = {
    addLog: addLog
}

function iniToObj(location) {
    var ini = fs.readFileSync(location, "ascii"),
        iniArray = parseINIString(ini);
    return iniArray;
}

function parseINIString(data) {
    var regex = {
        section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
        param: /^\s*([\w\.\-\_]+)\s*=\s*(.*?)\s*$/,
        comment: /^\s*;.*$/
    };
    var value = {};
    var lines = data.split(/\r\n|\r|\n/);
    var section = null;
    lines.forEach(function (line) {
        if (regex.comment.test(line)) {
            return;
        } else if (regex.param.test(line)) {
            var match = line.match(regex.param);
            if (section) {
                value[section][match[1]] = match[2];
            } else {
                value[match[1]] = match[2];
            }
        } else if (regex.section.test(line)) {
            var match = line.match(regex.section);
            value[match[1]] = {};
            section = match[1];
        } else if (line.length == 0 && section) {
            section = null;
        };
    });
    return value;
}