const cheerio = require('cheerio');

const str = `<div class="eui-form-check eui-form-check-inline">
<eui-checkbox [trueValue]="true" [falseValue]="false"
    title="{{'common.edit'|trans}}{{'common.attachment'|trans}}"
    [disabled]="!isBatch&&(control.hideChecked||control.disabledAction[actionKeyMap.attachmentEdit])"
    [(ngModel)]="control.editAttachmentChecked"
    (ngModelChange)="toggleAction(actionKeyMap.attachmentEdit, control, isBatch)">
    {{'common.edit'|trans}}{{'common.attachment'|trans}}
</eui-checkbox>
</div>`


function handleTrans(str) {
    const $ = cheerio.load(str, {
        xmlMode: false,
        decodeEntities: false,
    });
    const replaceList = [];
    $('*:contains(trans)').each(function () {
        $(this).children().map(function() {
            // 获取直接子节点的文本，不包含孙子节点
            let childText = $(this).contents().filter(function() {
                return this.nodeType === 3;
            }).text();
            const childNode = $(this).children();
            if(childText && childText.replace(/\s*/g,"") != "" && childNode.length > 0) {
                // console.log(childText)
                const regText = /{{([^(}})]+)?trans\s*}}/g;
                childText.match(regText)?.forEach(item => {
                    const repStr = `<span>${item}</span>`
                    const repReg = new RegExp( '(?<!")' + item.replace('|', "\\|") + '(?!")', 'g')
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

// 处理自定义标签（组件）中带有trans管道的文本，加上span标签
function customTagTrans(str) {
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
                const repStr = `<span>${item}</span>`;
                const repReg = new RegExp('(?<!")' + item.replace('|', "\\|").replace(/\./g, '\\.') + '(?!")', 'g')
                str = str.replace(repReg, repStr);
            });
        }
    })
    return str;
}

console.log(customTagTrans(str))