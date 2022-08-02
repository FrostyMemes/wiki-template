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
    var i, r, end = pos, res = [];

    for (i = 0; i < patterns.length; i++) {
      r = patterns[i].exec(str, end);
      if (!r) return;
      res.push(r.res);
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

const ptrTextField = opt(rgx(/(_)\1+/), null)
const ptrTextArea = opt(rgx(/\[(_*)\]/), null)
const ptrSquareBraceArea = opt(rgx(/\[(.*)\]/), null)
const ptrRoundBraceArea = opt(rgx(/\((.*?)\)/), null)
const ptrVerticalBraceArea = opt(rgx(/\|(.*)\|/), null)
const ptrRoundBraceContent = opt(rgx(/(?<=\()(.*?)(?=\))/), null)
const ptrSquareBraceContent = opt(rgx(/(?<=\[)(.*?)(?=\])/), null)
const ptrVerticalBraceContent = opt(rgx(/(?<=\|)(.*?)(?=\|)/), null)

const ptrFormCheckBraces = opt(any(ptrRoundBraceArea, ptrSquareBraceArea), null)

const ptrFormCheck =
  {
    "radio": [ptrRoundBraceArea, ptrRoundBraceContent],
    "checkbox": [ptrSquareBraceArea, ptrSquareBraceContent]
  }

const parse = (parseText) => {

  const literals = parseText
    .split(literalSplitter)
    .map(literal => literal.trim())
    .filter(Boolean)

  let id, type, value
  let tag
  let resultTemplate = ""

  literals.forEach(literal => {
    const literalParts = literal.split(':')
    const literalKey = ptrSquareBraceContent.exec(literalParts[0], 0)["res"]
    const literalBody = literalParts[1].trim()
    if (ptrTextField.exec(literalBody, 0)) {
      tag = (ptrTextArea.exec(literalBody, 0)) ? 'textarea' : 'input'
      resultTemplate += `
      <div class="form-floating mb-3">
        <${tag} class="form-control" name="${literalKey}" id="${literalKey}" placeholder="${literalKey}" ${(tag == 'input') ? ">" : "></textarea>"}
        <label for="${literalKey}">${literalKey}</label>
      </div>
      `
    } else {
      let optionLabel
      let selected
      let options = literalBody
        .split("\n")
        .map(value => value.trim())
        .filter(Boolean)

      tag = ""
      if (ptrVerticalBraceArea.exec(options[0], 0)) {
        options.forEach(option => {
          if (ptrVerticalBraceArea.exec(option, 0)) {
            value = ptrVerticalBraceContent.exec(option, 0)
            selected = (option[value["end"] + 2] == '+' ? "selected" : "")
            tag += `<option value="${value["res"]}" ${selected}>${value["res"]}</option>\n`
          }
        })
        resultTemplate += `
        <label for="${literalKey}" class="form-label">${literalKey}</label>
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
            selected = (value["res"] == '+') ? "checked" : ""
            optionLabel = option.slice(value["end"]+2).trim()
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
          <label for="${literalKey}" class="form-label">${literalKey}</label>
          ${tag}
        </div>
        `
      }
    }
  })

  return `<form>${resultTemplate}</form>`
}

module.exports = parse
