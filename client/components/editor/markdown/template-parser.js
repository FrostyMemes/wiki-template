/* eslint-disable */


function Pattern(exec) {
  this.exec = exec;
}

function txt(text) {
  return new Pattern(function (str, pos) {
    if (str.substr(pos, text.length) == text)
      return { res: text, end: pos + text.length };
  });
}

function rgx(regexp) {
  return new Pattern(function (str, pos) {
    let m = regexp.exec(str.slice(pos));
    if (m)
      return { res: m[0], end: pos + m[0].length };
  });
}

function opt(pattern, alt) {
  return new Pattern(function (str, pos) {
    return pattern.exec(str, pos) || alt;
  });
}

function exc(pattern, except) {
  return new Pattern(function (str, pos) {
    return pattern.exec(str, pos) && !except.exec(str, pos);
  });
}

function any(...patterns) {
  return new Pattern(function (str, pos) {
    for (var result, i = 0; i < patterns.length; i++)
      if (result = patterns[i].exec(str, pos))
        return result;
  });
}

function seq(...patterns) {
  return new Pattern(function (str, pos) {
    var i, r, end, res;

    for (i = 0; i < patterns.length; i++) {
      r = patterns[i].exec(str, pos);
      if (!r) return;
      res = r.res;
      end = r.end;
    }
    return { res: res, end: end };
  });
}

function rep(pattern, separator) {
  var separated = !separator ? pattern :
    seq(separator, pattern).then(r => r[1]);

  return new Pattern(function (str, pos) {
    var res = [], end = pos, r = pattern.exec(str, end);

    while (r && r.end > end) {
      res.push(r.res);
      end = r.end;
      r = separated.exec(str, end);
    }

    return { res: res, end: end };
  });
}

const literalSplitter = ';'

const ptrMarkGroupWords = /"([^"\\]*(\\.[^"\\]*)*)"|\'([^\'\\]*(\\.[^\'\\]*)*)\'/gi
const ptrTextField = opt(rgx(/(_)\1+/), null)
const ptrTextArea = opt(rgx(/\[(_*)\]/), null)
const ptrSquareBraceArea = opt(rgx(/\[(.*)\]/), null)
const ptrRoundBraceArea = opt(rgx(/\((.*?)\)/), null)
const ptrVerticalBraceArea = opt(rgx(/\|(.*)\|/), null)
const ptrFigureBraceArea = opt(rgx(/\{(.*)\}/), null)
const ptrSingleMarkArea = opt(rgx(/\'(.*)\'/), null)
const ptrDuoMarkArea = opt(rgx(/\"(.*)\"/), null)
const ptrRoundBraceContent = opt(rgx(/(?<=\()(.*?)(?=\))/), null)
const ptrSquareBraceContent = opt(rgx(/(?<=\[)(.*?)(?=\])/), null)
const ptrVerticalBraceContent = opt(rgx(/(?<=\|)(.*?)(?=\|)/), null)
const ptrFigureBraceContent = opt(rgx(/(?<=\{)(.*?)(?=\})/), null)
const ptrSingleMarkContent = opt(rgx(/(?<=\')(.*?)(?=\')/), null)
const ptrDuoMarkContent = opt(rgx(/(?<=\")(.*?)(?=\")/), null)

const ptrMarksArea = opt(any(ptrSingleMarkArea, ptrDuoMarkArea), null)
const ptrMarksContent = opt(any(ptrSingleMarkContent, ptrDuoMarkContent), null)

const ptrAttributes = opt(ptrFigureBraceContent, null)

const ptrFormCheck =
  {
    "radio": [ptrRoundBraceArea, ptrRoundBraceContent],
    "checkbox": [ptrSquareBraceArea, ptrSquareBraceContent]
  }

const parse = (parseText) => {

  try {

    const literals = parseText
      .split(literalSplitter)
      .map(literal => literal.trim())
      .filter(Boolean)

    let id, type, title, text
    let tag
    let resultTemplate = ``
    let keys = []


    literals.forEach(literal => {
      const attributes = ptrAttributes.exec(literal, 0)
      const literalKey = literal.split("{")[0].trim()
      const literalBody = literal
        .slice(attributes["end"])
        .split(":")[1]
        .trim()

      let value = `\n`
      title = (attributes) ? ptrMarksContent.exec(attributes["res"], 0)["res"] : literalKey
      if (ptrMarksArea.exec(literalBody, 0)) {
        let markGroups = literalBody.match(ptrMarkGroupWords)
        tag = (markGroups.length > 1) ? 'textarea' : 'input'
        markGroups.forEach(group => {
          text = ptrDuoMarkContent.exec(group, 0)
          value += (text["res"].trim() != "") ? `${text["res"]}\n` : `\n`
        })
        resultTemplate += `
      <div class="form-floating mb-3">
        <${tag} class="form-control" name="${literalKey}" id="${literalKey}" placeholder="${title}" ${(tag == 'input') ? ` value=${value}>` : `>${value}</textarea>`}
        <label for="${literalKey}">${title}</label>
      </div>
      `
      } else {
        let optionLabel
        let selected
        let options = literalBody
          .split(",")
          .map(value => value.trim())
          .filter(Boolean)

        tag = ""
        if (ptrVerticalBraceArea.exec(options[0], 0)) {
          options.forEach(option => {
            if (ptrVerticalBraceArea.exec(option, 0)) {
              value = ptrVerticalBraceContent.exec(option, 0)
              selected = (option[value["end"] + 2] == '*' ? "selected" : "")
              tag += `<option value="${value["res"]}" ${selected}>${value["res"]}</option>\n`
            }
          })
          resultTemplate += `
        <label for="${literalKey}" class="form-label">${title}</label>
        <select name="${literalKey}" id="${literalKey}" class="form-select mb-3" aria-label="${literalKey}">
          ${tag}
        </select>
        `
        } else {

          let idCounter = 1
          type = (ptrRoundBraceArea.exec(options[0], 0)) ? 'radio' : 'checkbox'
          options.forEach(option => {
            if (ptrFormCheck[type][0].exec(option, 0)) {
              value = ptrFormCheck[type][1].exec(option, 0)
              selected = (value["res"] == '*') ? "checked" : ""
              optionLabel = option.slice(value["end"] + 2).trim()
              id = `${literalKey}_${idCounter}`
              tag += `
              <div class="form-check">
                <input class="form-check-input" type="${type}" id="${id}" name="${literalKey}"  ${selected}>
                <label class="form-check-label" for="${id}">
                  ${optionLabel}
                </label>
              </div>
            `
              id++
            }
          })

          resultTemplate += `
        <div class="mb-3">
          <label for="${literalKey}" class="form-label">${title}</label>
          ${tag}
        </div>
        `
        }
      }

    })

    return `<form>${resultTemplate}</form>`
  }
  catch (err) {
    return `<div class="alert alert-danger" role="alert">
      Error: check syntax
    </div>`
  }

}

module.exports = parse

