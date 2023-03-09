var fs = require('fs');
var path = require('path');
const readline = require('readline');
const { addLog } = require('./log/serverLog');

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
                            if(filedir.indexOf('module.ts') !== -1) {
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
        fileStr = addModule(fileStr, () => {})
        addLog(`${url}  add I18nModule`, 'i18n');
        fs.writeFile(url, fileStr, err => {
            if(err) {
                console.log(err)
            }
        })
    })
}

function addModule(fileStr, logCallback) {
    const importTranslateRegex = /\bimport\s*\{\s*(.*?)\s*\}\s*from\s*['"](@)?shared\/pipe\/translate.*?['"]/g;
    const importI18nRegex = /\bimport\s*\{\s*(.*?)\s*\}\s*from\s*['"]@web-shared\/component\/i18n\/i18n.module.*?['"]/g;
    const i18nImportStr = "import { I18nModule } from '@web-shared/component/i18n/i18n.module';"
    const i18nReg = /(?<!{)I18nModule(?!})/g
    const transRes = /(?<!{[^{}]?)\bTranslateModule\b(?!})/g;
    // 首先找包含Translate的模块
    if(importTranslateRegex.test(fileStr) && transRes.test(fileStr)) {
        console.log('引入了TranslateModule 模块')
        // 没有引入I18nModule 才引入
        if(!i18nReg.test(fileStr)) {
            // 查找是否包含了import I18nModule 没有就先添加import
            if(!importI18nRegex.test(fileStr)) {
                fileStr = i18nImportStr + '\n' + fileStr
            }
            // 然后在imoports里面插入 I18nModule
            fileStr = fileStr.replace(transRes, "TranslateModule,\n        I18nModule")
        }
    }
    return fileStr
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

module.exports = {
    read
}