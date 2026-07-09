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

    const htmlResponse = await fetch(`components/${name}.html`);
    const cssResponse = await fetch(`css/${name}.css`);
    const jsonResponse = await fetch(`json/${name}.json`);
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
        
        const regex = new RegExp(`${control.selector.replace('.', '\\.')}\\s*{[^}]*${control.property}:\\s*([\\d\\.]+|#[0-9a-fA-F]{3,8})`);
        console.log(control.type, control.label);

        if (control.type === "slider") {
            element = createSlider(control, regex);
        } else if (control.type === "color") {
            element = createColorPicker(control, regex);
        } else if (control.type === "gradientColor") {
            element = createGradientColorPicker(control, regex);
        }
          else if (control.type === "checkbox") {
            element = createCheckbox(control);
        }

        // Add to Group
        const groupName = control.group || "General";
        if (!groups[groupName]) {
            groups[groupName] = new ControlGroup(groupName);
            controls.appendChild(groups[groupName].element);
        }
        groups[groupName].addControl(element);
    });
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

    // Initial state
    input.checked = control.default ?? true;

    // Apply initial CSS
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

    // Enable/disable linked controls
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

function createSlider(control, regex) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = control.label;
    
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = control.min;
    slider.max = control.max;
    slider.step = control.step;
    
    const match = editor.value.match(regex);
    slider.value = match ? match[1] : control.default;

    const valueLabel = document.createElement("span");
    valueLabel.textContent = slider.value + control.unit;

    slider.addEventListener("input", () => {
        valueLabel.textContent = slider.value + control.unit;
        
        const replaceRegex = new RegExp(`(${control.selector.replace('.', '\\.')}\\s*{[^}]*${control.property}:\\s*)([\\d\\.]+)`);
        editor.value = editor.value.replace(replaceRegex, `$1${slider.value}`);
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
    const match = editor.value.match(regex);

    if (match && match[1]) {
        slider.value = match[1];

        if (valueLabel) {
            valueLabel.textContent = slider.value + (control.unit || "");
        }
    }
}
        else if (type === 'color') {
            const match = editor.value.match(regex);
            if (match && match[1]) {
                item.picker.value = match[1].slice(0, 7);
            }
        }
        else if (type === "checkbox") {

            const regex = new RegExp(
            `${control.property}:\\s*${control.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

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
        colors[control.index] = picker.value;

        let i = 0;
        const updatedLine = currentLine.replace(/#[0-9a-fA-F]{3,8}/g, () => colors[i++]);

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
        const replaceRegex = new RegExp(`(${control.selector.replace('.', '\\.')}\\s*{[^}]*${control.property}:\\s*)(#[0-9a-fA-F]{3,8})`);
        editor.value = editor.value.replace(replaceRegex, `$1${picker.value}`);
        liveStyle.textContent = editor.value;
    });

    wrapper.appendChild(picker);
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

    // Force an immediate sync after the reset
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