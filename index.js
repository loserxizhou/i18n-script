var fs = require('fs');
var path = require('path');
const readline = require('readline');
const { addLog } = require('./log/serverLog');
const cheerio = require('cheerio');

//解析需要遍历的文件夹
var filePath = path.resolve('D:/E-office_Server/www/eoffice10_dev/client/web/src/app');

/**
 * 文件遍历方法
 * @param filePath 需要遍历的文件路径
 */
function fileDisplay(filePath){
    //根据文件路径读取文件，返回文件列表
    fs.readdir(filePath,function(err,files){
        if(err){
            console.warn(err)
        }else{
            //遍历读取到的文件列表
            files.forEach(function(filename){
                //获取当前文件的绝对路径
                var filedir = path.join(filePath,filename);
                //根据文件路径获取文件信息，返回一个fs.Stats对象
                fs.stat(filedir,function(eror,stats){
                    if(eror){
                        console.warn('获取文件stats失败');
                    }else{
                        var isFile = stats.isFile();//是文件
                        var isDir = stats.isDirectory();//是文件夹
                        if(isFile){
                            if(filedir.indexOf('html') !== -1) {
                                readLine(filedir, filename)
                            }
                        }
                        if(isDir){
                            fileDisplay(filedir);//递归，如果是文件夹，就继续遍历该文件夹下面的文件
                        }
                    }
                })
            });
        }
    });
}


function readLine(url, filename) {
    let fileStr = ''
    let fRead = fs.createReadStream(url);
    let objReadLine = readline.createInterface({
        input: fRead,
    });
    let lineNum = 0;
    objReadLine.on('line', function (line) {
        lineNum++
        if(fileStr === '') {
            fileStr =  line
        } else {
            fileStr = fileStr + '\n' + line
        }
    });
    objReadLine.on('close', () => {
        if(!fileStr) {
            return
        }
        fileStr = customTagTrans(fileStr);
        // 给单独的trans管道的文本添加span标签
        fileStr = handleTrans(fileStr);
        // 给带有trans管道的文本节点 添加 i18n 属性
        fileStr = setI18n(fileStr, (line) => {
            addLog(`${url}  line: ${line} add i18n`, 'i18n');
        })
        // 给带有euiTooltip或[euiTooltip]的标签 添加 i18n-title 属性
        fileStr = setI18nByEuiTooltip(fileStr, (line) => {
            addLog(`${url}  line: ${line} add i18n-title by euiTooltip`, 'i18n');
        });
        // 给带有title或[title]的标签 添加 i18n-title 属性
        fileStr = setI18nByTitle(fileStr, (line) => {
            addLog(`${url}  line: ${line} add i18n-title by title`, 'i18n');
        });
        // './testdir/' + filename
        fs.writeFile(url, fileStr, err => {
            if(err) {
                console.log(err)
            }
        })
    })
}

// 处理自定义标签（组件）中带有trans管道的文本，加上span标签
function customTagTrans(str) {
    str = specialCharBefore(str);
    const transReg = /<([\w-]+)([^>]*)>([^>]*)?<\/\1>/gm;
    if(!str.match(transReg)) {
        return str;
    }
    const transNodes = str.match(transReg).filter(item => {
        const reg = /\|\s*trans/g;
        return reg.test(item)
    });

    transNodes.forEach(node => {
        const $ = cheerio.load(node, {
            xmlMode: true,
            decodeEntities: false,
        });
        const tagList = 'a abbr acronym address applet area article aside audio b base basefont bdi bdo big blockquote body br button canvas caption center cite code col colgroup command datalist dd del details dfn dialog dir div dl dt em embed fieldset figcaption figure font footer form frame frameset h1  to h6 head header hr html i iframe img input ins kbd keygen label legend li link main map mark menu meta meter nav noframes noscript object ol optgroup option output p param pre progress q rp rt ruby s samp script section select small source span strike strong style sub summary sup table tbody td textarea tfoot th thead time template title tr track tt u ul var video wbr'
        const index = tagList.split(' ').findIndex(item => {
            return $('*')[0].tagName == item;
        });
        if(index == -1) {
            const regText = /{{([^}}]+)?\|\s*trans\s*}}/g;
            $.text().match(regText)?.forEach(item => {
                const repStr = specialCharBefore(`<span>${item}</span>`);
                const repReg = new RegExp('(?<!")' + item.replace('|', "\\|").replace(/\./g, '\\.') + '(?!")', 'g')
                str = str.replace(repReg, repStr);
            });
        }
    })
    return str;
}

// 处理带trans管道的文本，加上span标签
function handleTrans(str) {
    str = specialCharBefore(str);
    const $ = cheerio.load(str, {
        xmlMode: false,
        decodeEntities: false,
    });
    const replaceList = [];
    $('*:contains(trans)').each(function () {
        $(this).children().map(function() {
            // 获取直接子节点的文本，不包含孙子节点
            let childText = specialCharBefore($(this).contents().filter(function() {
                return this.nodeType === 3;
            }).text());
            const childNode = $(this).children();
            if(childText && childText.replace(/\s*/g,"") != "" && childNode.length > 0) {
                // console.log(childText)
                const regText = /{{([^(}})]+)?trans\s*}}/g;
                childText.match(regText)?.forEach(item => {
                    const repStr = `<span>${item}</span>`
                    const repReg = new RegExp( item.replace('|', "\\|"), 'g')
                    if(replaceList.findIndex(re => re == item) == -1) {
                        replaceList.push(item);
                        str = str.replace(repReg, repStr);
                    }
                });
            }
        });
    })
    return str;
}

// 给带有trans管道文本的标签加上i18n属性
function setI18n(str, logCallback) {
    let fileStr = str;
    // 获取带trans管道的html标签
    const transReg = /<([\w-]+)([^>]*)>([^>]*)?<\/\1>/gm;
    if(!fileStr.match(transReg)) {
        return str;
    }
    const transNodes = fileStr.match(transReg).filter(item => {
        const reg = /\|\s*trans/g;
        return reg.test(item);
    });
    transNodes.forEach(node => {
        node = specialCharBefore(node);
        // customTagTrans(node);
        const $ = cheerio.load(node, {
            xmlMode: true,
            decodeEntities: false,
        });
        const content = $.text();
        if(content == '' || !content) {
            return;
        }
        // 获取每个标签中的trans文本
        const idReg = /{{([^]*)?}}/g;
        const transList = content.match(idReg);
        if(!transList) {
            return
        }
        let transIdList = [];
        transList.forEach(item => {
            // 获取trans文本中的id
            const idList = item.match(/[\w\.\s]+(?=(('|")\s*\|\s*trans))/g);
            if(!idList) {
                return
            }
            transIdList = [...transIdList ,...idList];
        })
        const transIdString = transIdList.join(',');
        // 修改的位置（行数）
        const changeLines = fileStr.split(node)[0].split('\n').length
        // 通过dom对象设置属性
        $("*").attr('e-i18n-text', transIdString);
        $("*").addClass('i18n');
        const newNode = specialCharAfter(getXMLtext($.xml()));
        fileStr = fileStr.replace(node, newNode);
        logCallback(changeLines);
    });
    return fileStr;
}

// 给euiTooltip标签加上i18n-title属性
function setI18nByEuiTooltip(str, logCallback) {
    str = specialCharBefore(str);
    const $ = cheerio.load(str, {
        xmlMode: true,
        decodeEntities: false,
    });
    $('*').each(function() {
        const tagName = $(this).prop('tagName').toLowerCase();
        const tagList = 'br hr area base img input link meta basefont param col frame embed keygen source command track wbr'.split(' ');
        if($(this).text() == '' && tagList.findIndex(str => str == tagName) == -1) {
            $(this).append('@myPlace')
        }
    })
    $('[euiTooltip]').each(function() {
        const transText = $(this).attr('euiTooltip');
        const outerHtml = $(this).prop("outerHTML");
        // 修改的位置（行数）
        const changeLines = str.split(outerHtml)[0].split('\n').length;
        const idList = transText.match(/[\w\.\s]+(?=(('|")\s*\|\s*trans))/g);
        if(idList) {
            $(this).attr('e-i18n-title', idList.join(','));
            $(this).addClass('i18n');
            logCallback(changeLines);
        }
    })
    $('[\\[euiTooltip\\]]').each(function() {
        const transText = $(this).attr('[euiTooltip]');
        const outerHtml = $(this).prop("outerHTML");
        // 修改的位置（行数）
        const changeLines = str.split(outerHtml)[0].split('\n').length;
        const idList = transText.match(/[\w\.\s]+(?=(('|")\s*\|\s*trans))/g);
        if(idList) {
            $(this).attr('e-i18n-title', idList.join(','));
            $(this).addClass('i18n');
            logCallback(changeLines);
        }
    });
    return specialCharAfter(getXMLtext($.xml()));
}

// 给title标签加上i18n-title属性
function setI18nByTitle(str, logCallback) {
    str = specialCharBefore(str);
    const $ = cheerio.load(str, {
        xmlMode: true,
        decodeEntities: false,
    });
    $('*').each(function() {
        if($(this).text() == '') {
            const tagName = $(this).prop('tagName').toLowerCase();
            const tagList = 'br hr area base img input link meta basefont param col frame embed keygen source command track wbr'.split(' ');
            if($(this).text() == '' && tagList.findIndex(str => str == tagName) == -1) {
                $(this).append('@myPlace')
            }
        }
    })
    $('[title]').each(function() {
        const transText = $(this).attr('title');
        const outerHtml = $(this).prop("outerHTML");
        // 修改的位置（行数）
        const changeLines = str.split(outerHtml)[0].split('\n').length;
        const idList = transText.match(/[\w\.\s]+(?=(('|")\s*\|\s*trans))/g);
        if(idList) {
            $(this).attr('e-i18n-title', idList.join(','));
            $(this).addClass('i18n');
            logCallback(changeLines);
        }
    })
    $('[\\[title\\]]').each(function() {
        const transText = $(this).attr('[title]');
        const outerHtml = $(this).prop("outerHTML");
        // 修改的位置（行数）
        const changeLines = str.split(outerHtml)[0].split('\n').length;
        const idList = transText.match(/[\w\.\s]+(?=(('|")\s*\|\s*trans))/g);
        if(idList) {
            $(this).attr('e-i18n-title', idList.join(','));
            $(this).addClass('i18n');
            logCallback(changeLines);
        }
    });
    return specialCharAfter(getXMLtext($.xml()));
}

// 特殊字符提前转译
function specialCharBefore(str) {
    str = str.replace(/&amp;/g, "myChar_1");
    str = str.replace(/&quot;/g, 'myChar_2');
    str = str.replace(/&apos;/g, "myChar_3");
    str = str.replace(/&lt;/g, "myChar_4");
    str = str.replace(/&gt;/g, "myChar_5");
    return str;
}

// 特殊字符转译回来
function specialCharAfter(str) {
    str = str.replace(/myChar_1/g, "&amp;");
    str = str.replace(/myChar_2/g, '&quot;');
    str = str.replace(/myChar_3/g, "&apos;");
    str = str.replace(/myChar_4/g, "&lt;");
    str = str.replace(/myChar_5/g, "&gt;");
    return str;
}

// 特殊字符转化
function getXMLtext(xmlText) {
    xmlText = xmlText.replace(/&amp;/g, "&");
    // xmlText = xmlText.replace(/&quot;/g, '"');
    // xmlText = xmlText.replace(/&apos;/g, "'");
    // xmlText = xmlText.replace(/&lt;/g, "<");
    // xmlText = xmlText.replace(/&gt;/g, ">");
    xmlText = xmlText.replace(/@myPlace/g, "");
    xmlText = xmlText.replace(/(="")/g, "");
    const tagList = 'br hr area base img input link meta basefont param col frame embed keygen source command track wbr'.split(' ');
    tagList.forEach(item => {
        const re = new RegExp("<\\/" + item + ">", "g");
        xmlText = xmlText.replace(re, "");
    })
    // xmlText = xmlText.replace(/<\/br>/g, "");
    // xmlText = xmlText.replace(/<\/input>/g, "");
    // xmlText = xmlText.replace(/<\/img>/g, "");
    return xmlText;
}

// 转译项目中不标准的标签，例如<input> <img> <br> 没写闭合符合
function correctNode(str) {
    // const reg = /(<(input|br|img)([^>]*)>)([^>]*)?(<\/\2>)/gm;
    // while(r = reg.exec(str)) {  
    //     // console.log(r[5], "")
    //     str.replace(r[5], "")
    // } 

    return str;
}

//调用文件遍历方法
function read(filePath) {
    const insertPath = process.argv[2];
    if(!insertPath || insertPath == "") {
        console.log('请输入需要编辑文件的绝对路径');
        return;
    }
    filePath = insertPath;
    var stat = fs.lstatSync(filePath);
    if(stat.isFile()) {
        readLine(filePath)
    }
    if(stat.isDirectory()) {
        fileDisplay(filePath);
    }
}

read(filePath)