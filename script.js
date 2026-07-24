/* VARIABLES */

const menu = document.getElementById("menu");
const editorPage = document.getElementById("editorPage");

const controls = document.getElementById("controls"); /* Adjustments */

const preview = document.getElementById("preview");
const editor = document.getElementById("cssEditor");
const liveStyle = document.getElementById("liveStyle");
const colorControls = document.getElementById("colorControls");
const radiusSlider = document.getElementById("radiusSlider");
const propRegex = new RegExp(`border:\\s*[^;]*#[0-9a-fA-F]{3,8}`);

const copyBtns = document.querySelectorAll(".copyBtn");
const downloadBtns = document.querySelectorAll(".downloadBtn");
const resetBtns = document.querySelectorAll(".resetBtn");

const CodeBtn = document.getElementById("CodeBtn");
const PreviewBtn = document.getElementById("PreviewBtn");

let sliders = [];
let allControls = [];

/* CLASS FUNCTIONS */

class ControlGroup {
    constructor(name, iconSVG = "") {
        this.name = name;
        this.element = document.createElement("fieldset");
        this.element.className = "ControlGroupTitle";
        
        const legend = document.createElement("legend");
        
        if (iconSVG) {
            const iconWrapper = document.createElement("span");
            iconWrapper.className = "group-icon";
            iconWrapper.innerHTML = iconSVG;
            legend.appendChild(iconWrapper);
        }
        
        const title = document.createElement("span");
        title.textContent = " " + name;
        legend.appendChild(title);
        
        this.element.appendChild(legend);
    }

    addControl(element) {
        this.element.appendChild(element);
    }
}

/* CARD CLICK FUNCTION */

async function openPreset(name) {

    menu.classList.remove("visible");
    menu.classList.add("hidden");

    editorPage.classList.remove("hidden");
    editorPage.classList.add("visible");

    await loadPreset(name);
}

/* ORIGINAL CSS */

let originalCSS = "";

/* LOADER */

async function loadPreset(name) {

    const htmlResponse = await fetch(`https://cdn.jsdelivr.net/gh/1Crafty/Bloxd-CSS-Editor@d663a442ed322c02b76c3b7e87a7c72c875e8daf/components/${name}.html`);
    const cssResponse = await fetch(`https://cdn.jsdelivr.net/gh/1Crafty/Bloxd-CSS-Editor@d663a442ed322c02b76c3b7e87a7c72c875e8daf/css/${name}.css`);
    const jsonResponse = await fetch(`https://cdn.jsdelivr.net/gh/1Crafty/Bloxd-CSS-Editor@d663a442ed322c02b76c3b7e87a7c72c875e8daf/json/${name}.json`);
    const html = await htmlResponse.text();
    const css = await cssResponse.text();
    const config = await jsonResponse.json();

    preview.innerHTML = html;
    editor.value = css;
    liveStyle.textContent = css;
    originalCSS = css;

    buildControls(config);
}

/* CONTROLS BUILDER */

function buildControls(config) {
    controls.innerHTML = "";
    allControls = []; 
    const groups = {}; 

    config.forEach(control => {
        let element;
        let regex = null;

        if (control.type === "image") {
            const selectorEscaped = escapeRegExp(control.selector || "");
            regex = new RegExp(`${selectorEscaped}\\s*\\{([^}]*)}`);
        } else if (control.type === "slider" || control.type === "color" || control.type === "gradientColor") {
            const selectorEscaped = escapeRegExp(control.selector || "");
            regex = new RegExp(`${selectorEscaped}\\s*\\{[^}]*${control.property}:\\s*([\\d\\.]+|#[0-9a-fA-F]{3,8})`);
        } else if (control.type === "color-opacity" || control.type === "color-shadow") {
            const selectorEscaped = escapeRegExp(control.selector || "");
            regex = new RegExp(`${selectorEscaped}\\s*\\{[^}]*${escapeRegExp(control.property)}:\\s*([^;]+)`);
        }
        console.log(control.type, control.label);

        if (control.type === "slider") {
            element = createSlider(control, regex);
        } else if (control.type === "color") {
            element = createColorPicker(control, regex);
        } else if (control.type === "gradientColor") {
            element = createGradientColorPicker(control, regex);
        } else if (control.type === "color-opacity") {
            element = createColorOpacityControl(control, regex);
        } else if (control.type === "color-shadow") {
            element = createColorShadowControl(control, regex);
        } else if (control.type === "image") {
            element = createImageInput(control, regex);
        } else if (control.type === "link") {
            element = createLinkControl(control);
        } else if (control.type === "checkbox") {
            element = createCheckbox(control);
        }

        const groupName = control.group || "General";
        if (!groups[groupName]) {
            groups[groupName] = new ControlGroup(groupName);
            controls.appendChild(groups[groupName].element);
        }
        groups[groupName].addControl(element);
    });
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeImageValue(value) {
    let current = value.trim().replace(/\s*!important\s*$/i, "").trim();
    const urlMatch = current.match(/^url\((.*)\)$/i);

    if (urlMatch) {
        current = urlMatch[1].trim();
        if ((current.startsWith('"') && current.endsWith('"')) || (current.startsWith("'") && current.endsWith("'"))) {
            current = current.slice(1, -1);
        }
    }

    return current;
}

function formatImageValue(value, unit) {
    if (unit === "url") {
        const trimmed = value.trim();
        if (!trimmed) return "none";

        let inner = normalizeImageValue(trimmed);
        inner = inner.replace(/^['"]|['"]$/g, "");
        return `url("${inner}")`;
    }

    return value;
}

function extractImageUrl(value) {
    return normalizeImageValue(value);
}

function createLinkControl(control) {
    const wrapper = document.createElement("div");
    wrapper.className = "LinkControl";

    if (control.label) {
        const label = document.createElement("span");
        label.className = "LinkControlLabel";
        label.textContent = control.label;
        wrapper.appendChild(label);
    }

    const link = document.createElement("a");
    link.className = "LinkControlButton";
    link.href = control.link || "#";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = control.text || control.label || "Open link";
    wrapper.appendChild(link);

    return wrapper;
}

function parseOpacityFromColorValue(value) {
    const trimmed = (value || "").trim().replace(/\s*!important\s*$/i, "").trim();
    if (!trimmed) return 100;

    const colorMatch = trimmed.match(/(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-fA-F]{3,4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8})/i);
    const colorValue = colorMatch ? colorMatch[1] : trimmed;

    const rgbaMatch = colorValue.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbaMatch) {
        const parts = rgbaMatch[1].split(",").map(part => part.trim());
        if (parts.length >= 4) {
            const alpha = parseFloat(parts[3]);
            if (!Number.isNaN(alpha)) {
                return Math.round(Math.max(0, Math.min(1, alpha)) * 100);
            }
        }
        return 100;
    }

    const hexMatch = colorValue.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hexMatch) {
        let hex = hexMatch[1];
        if (hex.length === 3 || hex.length === 4) {
            hex = hex.split("").map(ch => ch + ch).join("");
        }

        if (hex.length === 8) {
            const alphaHex = hex.slice(6, 8);
            const alpha = parseInt(alphaHex, 16);
            return Math.round((alpha / 255) * 100);
        }
    }

    return 100;
}

function buildColorWithOpacity(value, opacityPercent) {
    const num = Number(opacityPercent);
    const opacity = Math.max(
    0,
    Math.min(100, Number.isNaN(num) ? 100 : num)
    );
    const alphaHex = Math.round((opacity / 100) * 255).toString(16).padStart(2, "0");
    const trimmed = (value || "").trim().replace(/\s*!important\s*$/i, "").trim();

    const colorMatch = trimmed.match(/(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-fA-F]{3,4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8})/i);
    const colorValue = colorMatch ? colorMatch[1] : trimmed;

    const rgbaMatch = colorValue.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbaMatch) {
        const parts = rgbaMatch[1].split(",").map(part => part.trim());
        if (parts.length >= 3) {
            const r = parseInt(parts[0], 10).toString(16).padStart(2, "0");
            const g = parseInt(parts[1], 10).toString(16).padStart(2, "0");
            const b = parseInt(parts[2], 10).toString(16).padStart(2, "0");
            return `#${r}${g}${b}${alphaHex}`;
        }
    }

    const hexMatch = colorValue.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hexMatch) {
        let hex = hexMatch[1];
        if (hex.length === 3 || hex.length === 4) {
            hex = hex.split("").map(ch => ch + ch).join("");
        }

        if (hex.length === 6 || hex.length === 8) {
            const base = hex.slice(0, 6);
            return `#${base}${alphaHex}`;
        }
    }

    return trimmed;
}

function updateOpacityInValue(value, opacityPercent) {
    const trimmed = (value || "").trim().replace(/\s*!important\s*$/i, "").trim();
    if (!trimmed || trimmed.toLowerCase() === "none") return trimmed;

    const colorMatch = trimmed.match(/^(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-fA-F]{3,4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8})$/i);
    if (!colorMatch) return trimmed;

    return buildColorWithOpacity(colorMatch[1], opacityPercent);
}

function updateOpacityInBoxShadowValue(value, opacityPercent) {
    const trimmed = (value || "").trim().replace(/\s*!important\s*$/i, "").trim();
    if (!trimmed || trimmed.toLowerCase() === "none") return trimmed;

    return trimmed.split(",").map(part => part.trim()).filter(Boolean).map(part => {
        const colorMatch = part.match(/(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-fA-F]{3,4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8})\s*$/i);
        if (!colorMatch) return part;

        const colorToken = colorMatch[1];
        const nextColor = buildColorWithOpacity(colorToken, opacityPercent);
        return part.replace(colorToken, nextColor);
    }).join(", ");
}

function normalizeColorInputValue(value) {
    const trimmed = (value || "").trim().replace(/\s*!important\s*$/i, "").trim();
    const hexMatch = trimmed.match(/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/i);

    if (!hexMatch) return "#ffffff";

    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
        hex = hex.split("").map(ch => ch + ch).join("");
    }

    return `#${hex.slice(0, 6)}`;
}

function getBoxShadowColorToken(value) {
    const trimmed = (value || "").trim().replace(/\s*!important\s*$/i, "").trim();
    if (!trimmed || trimmed.toLowerCase() === "none") return "";

    const shadowParts = trimmed.split(",").map(part => part.trim()).filter(Boolean);

    for (const shadowPart of shadowParts) {
        const match = shadowPart.match(/(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-fA-F]{3,4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8})\s*$/i);
        if (match) return match[1];
    }

    return "";
}

function replaceBoxShadowColorValue(value, newColor) {
    const trimmed = (value || "").trim().replace(/\s*!important\s*$/i, "").trim();
    if (!trimmed || trimmed.toLowerCase() === "none") return trimmed;

    const shadowParts = trimmed.split(",").map(part => part.trim()).filter(Boolean);

    return shadowParts.map(part => {
        const match = part.match(/(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-fA-F]{3,4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8})\s*$/i);
        if (!match) return part;

        const oldColor = match[1];
        let alpha = "";

        if (oldColor.startsWith("#") && oldColor.length === 9) {
            alpha = oldColor.slice(7, 9);
        }

        return part.replace(oldColor, `${newColor}${alpha}`);
    }).join(", ");
}

function createColorOpacityControl(control, regex) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = control.label;
    wrapper.appendChild(label);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = 0;
    slider.max = 100;
    slider.step = 1;

    const match = editor.value.match(regex);
    const currentValue = match && match[1] ? match[1].trim() : "";
    slider.value = parseOpacityFromColorValue(currentValue);

    const valueLabel = document.createElement("span");
    valueLabel.textContent = `${slider.value}%`;

    slider.addEventListener("input", () => {
        const match = editor.value.match(regex);
        const currentValue = match && match[1] ? match[1].trim() : "";

        if (!currentValue) return;

        const nextValue = control.property.toLowerCase() === "box-shadow"
            ? updateOpacityInBoxShadowValue(currentValue, slider.value)
            : updateOpacityInValue(currentValue, slider.value);
        const propertyRegex = new RegExp(`(${escapeRegExp(control.selector)}\\s*\\{[^}]*?${escapeRegExp(control.property)}:\\s*)([^;]+?)(\\s*!important)?\\s*;`, "i");
        editor.value = editor.value.replace(propertyRegex, (fullMatch, prefix, existingValue, importantFlag) => {
            return `${prefix}${nextValue}${importantFlag || ""};`;
        });
        valueLabel.textContent = `${slider.value}%`;
        liveStyle.textContent = editor.value;
    });

    allControls.push({ type: "color-opacity", control, slider, valueLabel, regex });

    wrapper.appendChild(slider);
    wrapper.appendChild(valueLabel);
    controls.appendChild(wrapper);
    return wrapper;
}

function createColorShadowControl(control, regex) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = control.label;
    wrapper.appendChild(label);

    const picker = document.createElement("input");
    picker.type = "color";

    const match = editor.value.match(regex);
    const currentValue = match && match[1] ? match[1].trim() : "";
    const currentColor = getBoxShadowColorToken(currentValue);
    if (currentColor) {
        picker.value = normalizeColorInputValue(currentColor);
    }

    picker.addEventListener("input", () => {
        const match = editor.value.match(regex);
        const currentValue = match && match[1] ? match[1].trim() : "";

        if (!currentValue) return;

        const nextValue = replaceBoxShadowColorValue(currentValue, picker.value);
        const propertyRegex = new RegExp(`(${escapeRegExp(control.selector)}\\s*\\{[^}]*?${escapeRegExp(control.property)}:\\s*)([^;]+?)(\\s*!important)?\\s*;`, "i");

        editor.value = editor.value.replace(propertyRegex, (fullMatch, prefix, existingValue, importantFlag) => {
            return `${prefix}${nextValue}${importantFlag || ""};`;
        });
        liveStyle.textContent = editor.value;
    });

    allControls.push({ type: "color-shadow", control, picker, regex });

    wrapper.appendChild(picker);
    controls.appendChild(wrapper);
    return wrapper;
}

function createCheckbox(control) {

    const wrapper = document.createElement("label");
    wrapper.className = "container";

    const input = document.createElement("input");
    input.type = "checkbox";

    const checkmark = document.createElement("div");
    checkmark.className = "checkmark";

    const text = document.createElement("span");
    text.textContent = control.label;

    wrapper.append(input, checkmark, text);

    input.checked = control.default ?? true;

    updateToggle(control, input.checked);

    input.addEventListener("change", () => {
        updateToggle(control, input.checked);
    });

    allControls.push({
        type: "checkbox",
        control,
        input,
        wrapper
    });

    return wrapper;
}

function updateToggle(control, enabled) {

    const value = enabled ? control.enabled : control.disabled;

    const selectorRegex = new RegExp(
        `(${control.selector.replace(".", "\\.")}\\s*\\{)([\\s\\S]*?)(\\})`
    );

    editor.value = editor.value.replace(selectorRegex, (match, start, body, end) => {

        const propertyRegex = new RegExp(
            `${control.property}:\\s*[^;]+;`
        );

        if (propertyRegex.test(body)) {

            body = body.replace(
                propertyRegex,
                `${control.property}: ${value} !important;`
            );

        } else {

            body += `\n    ${control.property}: ${value} !important;`;

        }

        return start + body + end;

    });

    liveStyle.textContent = editor.value;

    allControls.forEach(item => {

        if (item.control.toggle === control.id) {

            if (item.picker)
                item.picker.disabled = !enabled;

            if (item.slider)
                item.slider.disabled = !enabled;

            item.wrapper.style.opacity =
                enabled ? "1" : ".5";

        }

    });

}

function enforceDefault(control) {

    const exists = editor.value.includes(control.property);
    
    if (!exists) {
        const selectorRegex = new RegExp(`(${control.selector.replace('.', '\\.')}\\s*{)`);
        const defaultValue = control.type === "checkbox" ? control.value : control.default;
        
        editor.value = editor.value.replace(selectorRegex, `$1\n    ${control.property}: ${defaultValue} !important;`);
        liveStyle.textContent = editor.value;
    }
}

function getSliderUnit(control) {
    if (control.unit) return control.unit;
    if (control.filter === "hue-rotate") return "deg";
    if (control.filter === "blur") return "px";
    return "";
}

function getSliderValueFromCSS(control, cssText = editor.value) {
    const selectorEscaped = escapeRegExp(control.selector || "");
    const selectorRegex = new RegExp(`${selectorEscaped}\\s*\\{([^}]*)}`, "i");
    const blockMatch = cssText.match(selectorRegex);

    if (!blockMatch) return control.default || 0;

    const block = blockMatch[1];
    const propertyRegex = new RegExp(`${escapeRegExp(control.property)}:\\s*([^;]+)`, "i");
    const propertyMatch = block.match(propertyRegex);

    if (!propertyMatch) return control.default || 0;

    const rawValue = propertyMatch[1].trim().replace(/\s*!important\s*$/i, "").trim();

    if (control.filter) {
        const filterMatch = rawValue.match(new RegExp(`${escapeRegExp(control.filter)}\\(\\s*([\\d\\.]+)(deg|px)?\\s*\\)`, "i"));
        return filterMatch ? filterMatch[1] : (control.default || 0);
    }

    const numericMatch = rawValue.match(/^([\d\.]+)/);
    return numericMatch ? numericMatch[1] : (control.default || 0);
}

function updateSliderValueInCSS(control, value, cssText = editor.value) {
    const selectorEscaped = escapeRegExp(control.selector || "");
    const propertyRegex = new RegExp(`(${selectorEscaped}\\s*\\{[^}]*?${escapeRegExp(control.property)}:\\s*)([^;]+?)(\\s*!important)?\\s*;`, "i");

    return cssText.replace(propertyRegex, (fullMatch, prefix, existingValue, importantFlag) => {
        let nextValue = existingValue.trim().replace(/\s*!important\s*$/i, "").trim();

        if (control.filter) {
            const filterRegex = new RegExp(`${escapeRegExp(control.filter)}\\(\\s*[\\d\\.]+(?:deg|px)?\\s*\\)`, "i");
            const unit = getSliderUnit(control);

            if (filterRegex.test(nextValue)) {
                nextValue = nextValue.replace(filterRegex, `${control.filter}(${value}${unit})`);
            } else {
                nextValue = `${control.filter}(${value}${unit})`;
            }
        } else {
            nextValue = `${value}${getSliderUnit(control)}`;
        }

        return `${prefix}${nextValue}${importantFlag || ""};`;
    });
}

function createSlider(control, regex) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = control.label;
    
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = control.min;
    slider.max = control.max;
    slider.step = control.step;
    
    slider.value = getSliderValueFromCSS(control, editor.value);

    const valueLabel = document.createElement("span");
    const sliderUnit = getSliderUnit(control);
    valueLabel.textContent = `${slider.value}${sliderUnit}`;

    slider.addEventListener("input", () => {
        valueLabel.textContent = `${slider.value}${sliderUnit}`;
        editor.value = updateSliderValueInCSS(control, slider.value, editor.value);
        liveStyle.textContent = editor.value;
    });

    allControls.push({ type: 'slider', control, slider, valueLabel, regex });

    wrapper.appendChild(label);
    wrapper.appendChild(slider);
    wrapper.appendChild(valueLabel);
    controls.appendChild(wrapper);

    return wrapper;
}

function syncControlsFromCSS() {
    allControls.forEach(item => {
        const { type, regex, slider, valueLabel, control, input } = item;

        if (type === "slider") {
    const currentValue = getSliderValueFromCSS(control, editor.value);

    if (currentValue !== undefined) {
        slider.value = currentValue;

        if (valueLabel) {
            valueLabel.textContent = `${slider.value}${getSliderUnit(control)}`;
        }
    }
}
        else if (type === 'color') {
    const match = editor.value.match(item.regex);
    if (match && match[1]) {
        let hex = match[1];
        
        if (hex.length === 4) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        item.picker.value = hex.slice(0, 7); 
    }
}
        else if (type === 'color-opacity') {
    const match = editor.value.match(item.regex);
    if (match && match[1]) {
        slider.value = parseOpacityFromColorValue(match[1]);
        if (valueLabel) {
            valueLabel.textContent = `${slider.value}%`;
        }
    }
}
        else if (type === 'color-shadow') {
    const match = editor.value.match(item.regex);
    if (match && match[1]) {
        const shadowColor = getBoxShadowColorToken(match[1]);
        if (shadowColor) {
            item.picker.value = normalizeColorInputValue(shadowColor);
        }
    }
}
        else if (type === "checkbox") {
    const valToMatch = control.value || ""; 
    
    const regex = new RegExp(
        `${control.property}:\\s*${valToMatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
    );

    input.checked = regex.test(editor.value);
}
        else if (type === 'gradientColor') {
            const selectorEscaped = control.selector.replace('.', '\\.');
            const blockRegex = new RegExp(`${selectorEscaped}\\s*{([^}]*)}`);
            const blockMatch = editor.value.match(blockRegex);

            if (blockMatch) {
                const propRegex = new RegExp(`${control.property}:\\s*([^;]+)`);
                const propMatch = blockMatch[1].match(propRegex);

                if (propMatch) {
                    const colors = propMatch[1].match(/#[0-9a-fA-F]{3,8}/g) || [];
                    item.picker.value = (colors[control.index] || control.default || '#ffffff').slice(0, 7);
                }
            }
        } else if (type === 'image') {
            let current = "";
            const match = editor.value.match(item.regex);

            if (match && match[1]) {
                const blockBody = match[1];
                const propertyMatch = blockBody.match(new RegExp(`${control.property}:\\s*([^;]+)`));
                current = propertyMatch ? propertyMatch[1].trim() : "";
            }

            if (control.unit === "url") {
                current = extractImageUrl(current);
            }

            item.textarea.value = current;
        }
    });
}

function createGradientColorPicker(control, regex) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = control.label;
    const picker = document.createElement("input");
    picker.type = "color";


    function getPropertyLine() {
        const blockRegex = new RegExp(`${control.selector.replace('.', '\\.')}\\s*{([^}]*)}`);
        const blockMatch = editor.value.match(blockRegex);
        if (!blockMatch) return null;

        const propRegex = new RegExp(`${control.property}:\\s*([^;]+)`);
        const propMatch = blockMatch[1].match(propRegex);
        return propMatch ? propMatch[0] : null;
    }


    const line = getPropertyLine();
    if (line) {
        const colors = line.match(/#[0-9a-fA-F]{3,8}/g) || [];
        picker.value = (colors[control.index] || "#ffffff").slice(0, 7);
    }


    allControls.push({
    type: "gradientColor",
    control,
    picker,
    wrapper,
    regex,
    getPropertyLine
    });

    picker.addEventListener("input", () => {
    let currentLine = getPropertyLine();
    if (!currentLine) return;

    let colors = currentLine.match(/#[0-9a-fA-F]{3,8}/g) || [];

    const oldColor = colors[control.index] || "#ffffff";

    let alpha = "";
    if (oldColor.length === 9) {
        alpha = oldColor.slice(7, 9);
    }

    colors[control.index] = picker.value + alpha;

    let i = 0;
    const updatedLine = currentLine.replace(
        /#[0-9a-fA-F]{3,8}/g,
        () => colors[i++]
    );

    editor.value = editor.value.replace(currentLine, updatedLine);
    liveStyle.textContent = editor.value;
    });

    wrapper.appendChild(label);
    wrapper.appendChild(picker);
    controls.appendChild(wrapper);

    return wrapper;
}

function createColorPicker(control, regex) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = control.label;
    wrapper.appendChild(label);

    const picker = document.createElement("input");
    picker.type = "color";


    allControls.push({ 
        type: 'color', 
        control, 
        picker, 
        regex
    });


    const match = editor.value.match(regex);
    if (match && match[1]) picker.value = match[1].slice(0, 7);

    picker.addEventListener("input", () => {
    const replaceRegex = new RegExp(
        `(${control.selector.replace('.', '\\.')}\\s*{[^}]*${control.property}:\\s*)(#[0-9a-fA-F]{3,8})`
    );

    editor.value = editor.value.replace(replaceRegex, (match, prefix, oldColor) => {

        let alpha = "";

        if (oldColor.length === 9) {
            alpha = oldColor.slice(7, 9);
        }

        return `${prefix}${picker.value}${alpha}`;
    });

    liveStyle.textContent = editor.value;
    });

    wrapper.appendChild(picker);
    controls.appendChild(wrapper);
    return wrapper;
}

function createImageInput(control, regex) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = control.label;
    wrapper.appendChild(label);

    const textarea = document.createElement("textarea");
    textarea.className = "ImageInput";
    textarea.rows = 1;
    textarea.placeholder = control.unit === "url" ? "Enter image URL" : "Enter value";

    let current = "";
    if (regex) {
        const match = editor.value.match(regex);
        if (match && match[1]) {
            const blockBody = match[1];
            const propertyMatch = blockBody.match(new RegExp(`${control.property}:\\s*([^;]+)`));
            current = propertyMatch ? propertyMatch[1].trim() : "";
        }
    }

    if (control.unit === "url") {
        current = extractImageUrl(current);
    }

    textarea.value = current;

    textarea.addEventListener("input", () => {
        const newValue = formatImageValue(textarea.value, control.unit);
        const replaceRegex = new RegExp(`(${escapeRegExp(control.selector)}\\s*{[\\s\\S]*?${control.property}:\\s*)([^;]*?)(\\s*!important)?\\s*;`);

        if (replaceRegex.test(editor.value)) {
            editor.value = editor.value.replace(replaceRegex, `$1${newValue}$3;`);
        } else {
            const selectorRegex = new RegExp(`(${escapeRegExp(control.selector)}\\s*{)`);
            editor.value = editor.value.replace(selectorRegex, `$1\n    ${control.property}: ${newValue} !important;`);
        }

        liveStyle.textContent = editor.value;
    });

    allControls.push({ type: 'image', control, textarea, regex });

    wrapper.appendChild(textarea);
    controls.appendChild(wrapper);
    return wrapper;
}

/* BUTTON ACTIONS */

function getActiveEditorValue() {
    return document.getElementById("cssEditor").value; 
}

copyBtns.forEach(btn => {
    btn.onclick = () => {
        const textToCopy = getActiveEditorValue();
        navigator.clipboard.writeText(textToCopy);
    };
});

downloadBtns.forEach(btn => {
    btn.onclick = () => {
        const textToDownload = getActiveEditorValue();
        const blob = new Blob([textToDownload], { type: "text/css" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "style.css";
        a.click();
    };
});

resetBtns.forEach(btn => {
    btn.onclick = () => Reset();
});

function Reset() {
    editor.value = originalCSS;
    liveStyle.textContent = originalCSS;

    syncControlsFromCSS();
};

function goBack() {

    menu.classList.remove("hidden");
    menu.classList.add("visible");

    editorPage.classList.remove("visible");
    editorPage.classList.add("hidden");

    editorPage.addEventListener(
        "transitionend",
        function clearPage() {

            preview.innerHTML = "";
            editor.value = "";
            liveStyle.textContent = "";

            editorPage.removeEventListener(
                "transitionend",
                clearPage
            );
        }
    );
}

function viewCode() {

    CodePage.classList.remove("hidden");
    CodePage.classList.add("visible");

    EditorPage.classList.remove("visible");
    EditorPage.classList.add("hidden");

}

function viewEditor() {

    EditorPage.classList.remove("hidden");
    EditorPage.classList.add("visible");

    CodePage.classList.remove("visible");
    CodePage.classList.add("hidden");

}

/* EVENT LISTENERS */

editor.addEventListener("input", () => {

    liveStyle.textContent = editor.value;

    syncControlsFromCSS();

});

editor.addEventListener("keydown", (e) => {

    if (e.key !== "Enter") return;

    const start = editor.selectionStart;

    const textBefore =
        editor.value.substring(0, start);

    if (!textBefore.trimEnd().endsWith(";"))
        return;

    e.preventDefault();

    editor.setRangeText(
        "\n    ",
        start,
        start,
        "end"
    );

});
