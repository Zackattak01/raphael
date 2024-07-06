const backend = await browser.runtime.getBackgroundPage();
const container = document.getElementById("container");
const loginElement = document.getElementById("login");
//let after = null;

async function changeContent(id) {
    let result = await content[id]();
    if (result != null) {
        return changeContent(result);
    }

    for (const child of container.children) {
        if (child.id === id)
            child.classList.add("show");
        else
            child.classList.remove("show");
    }

}

const content = {};
content.setupId = "setup"
content.animeId = "anime"
content.animeMissingId = "anime-missing"
content.pageNotMatchedId = "page-not-matched"
    
content[content.setupId] = async () => {
    const loginContainer = document.getElementById(content.setupId + "-login");
    loginContainer.textContent = "";

    if (!await backend.isAuthed()) {
        const loginButton = document.createElement("button");
        loginButton.textContent = "Login"

        loginButton.addEventListener("click", _ => backend.login());

        loginContainer.appendChild(loginButton);
    }
    else {
        const p = document.createElement("p");
        p.textContent = "Your logged in!";

        loginContainer.appendChild(p);
    }

    const parsingInfo = await backend.getParsingInfo();
    const detectionContainer = document.getElementById(content.setupId + "-detection");

    let patternInputHandler = (index) => async (e) => {
        const value = e.target.value;

        if (value !== "") {
            if (index)
                parsingInfo.pagePatterns[index] = value;
            else {
                parsingInfo.pagePatterns.push(value);
                renderPagePatterns(); 
            }

            await backend.setParsingInfo(parsingInfo);
        }
        else if (index !== undefined) {
            parsingInfo.pagePatterns.splice(index, 1);
            await backend.setParsingInfo(parsingInfo);
            renderPagePatterns();
        }
    }

    let renderPagePatterns = () => {
        detectionContainer.textContent = "";

        let index = 0;
        for (const pattern of parsingInfo.pagePatterns) {
            const input = document.createElement("input");
            input.classList.add("grow");
            input.setAttribute("type", "text");
            input.setAttribute("value", pattern);
            input.addEventListener("change", patternInputHandler(index))

            const container = document.createElement("div");
            container.classList.add("flex");
            container.appendChild(input);

            detectionContainer.appendChild(container);
            index++;
        }

        const input = document.createElement("input");
        input.classList.add("grow");
        input.setAttribute("type", "text");
        input.setAttribute("placeholder", "New pattern");

        let handler = patternInputHandler();
        input.addEventListener("change", handler)

        const container = document.createElement("div");
        container.classList.add("flex");
        container.appendChild(input);

        detectionContainer.appendChild(container);

    }

    renderPagePatterns();

    const replacementContainer = document.getElementById(content.setupId + "-replacement");

    const addReplacementHandler = (patternInput, valueInput) => async () => {
        const replacer = {
            pattern: patternInput.value,
            value: valueInput.value
        };

        parsingInfo.replacers.push(replacer);

        await backend.setParsingInfo(parsingInfo);
        renderReplacements();
    }

    const renderReplacements = () => {
        for (const replacer of parsingInfo.replacers) {
            const patternInput = document.createElement("input");
            patternInput.setAttribute("value", replacer.pattern);

            const valueInput = document.createElement("input");
            valueInput.setAttribute("value", replacer.value);

            const container = document.createElement("div");
            container.classList.add("flex", "gap-2");
            container.appendChild(patternInput);
            container.appendChild(valueInput);

            replacementContainer.appendChild(container);
        }

        const newPatternInput = document.createElement("input");
        newPatternInput.setAttribute("placeholder", "Replacement Pattern");

        const newValueInput = document.createElement("input");
        newValueInput.setAttribute("placeholder", "Replacement Value");

        const addButton = document.createElement("button");
        addButton.textContent = "Add";
        addButton.classList.add("btn-link");
        addButton.addEventListener("click", addReplacementHandler(newPatternInput, newValueInput))

        const newReplacementContainer = document.createElement("div");
        newReplacementContainer.classList.add("flex", "gap-2");
        newReplacementContainer.appendChild(newPatternInput);
        newReplacementContainer.appendChild(newValueInput);
        newReplacementContainer.appendChild(addButton);

        replacementContainer.appendChild(newReplacementContainer);
    }

    renderReplacements();
}

content[content.animeId] = async () => {
    let currentAnime = await backend.getCurrentAnime();

    if (!currentAnime)
        return content.pageNotMatchedId;
    else if (currentAnime.malId) {
        let img = document.getElementById(content.animeId + "-cover");
        img.setAttribute("src", currentAnime.coverUrl);

        let h = document.getElementById(content.animeId + "-name");
        h.textContent = currentAnime.name;

        let incorrectInfoButton = document.getElementById(content.animeId + "-info-incorrect");

        let incorrectInfoHandler = async () => {
            await backend.markAnimeInfoIncorrect(currentAnime)
            await changeContent(content.animeMissingId);
        }

        incorrectInfoButton.removeEventListener("click", incorrectInfoHandler);
        incorrectInfoButton.addEventListener("click", incorrectInfoHandler);

        let deleteInfoButton = document.getElementById(content.animeId + "-delete");

        let deleteInfoHandler = async () => {
            await backend.deleteAnime(currentAnime);
            window.close();
        }

        deleteInfoButton.removeEventListener("click", deleteInfoHandler);
        deleteInfoButton.addEventListener("click", deleteInfoHandler);

        let b = document.getElementById(content.animeId + "-tracking-button");
        let renderButton = () => {
            if (currentAnime.tracking === true) {
                b.classList.add("btn-red");
                b.textContent = "Stop Tracking";
            }
            else {
                b.classList.remove("red-btn");
                b.textContent = "Start Tracking";
            }
        }

        let trackingButtonHandler = async () => {
            await backend.setTrackingState(currentAnime);
            renderButton();
        }

        b.removeEventListener("click", trackingButtonHandler);
        b.addEventListener("click", trackingButtonHandler);
        renderButton();

        let watchedEpCountInput = document.getElementById(content.animeId + "-watched-count");
        let renderWatchedEpCount = () => {
            watchedEpCountInput.value = currentAnime.eps.length;
            let style = `width: ${watchedEpCountInput.value.length}ch`
            watchedEpCountInput.setAttribute("style", style);
        }

        let epChangeHandler = async (e) => {
            let epCount = parseInt(e.target.value);
            
            if (!isNaN(epCount))
                await backend.setEpisodeCount(currentAnime, epCount);

            watchedEpCountInput.blur();
            renderWatchedEpCount();
        }

        let epInputHandler = (e) => {
            let width = e.target.value.length !== 0 ? e.target.value.length : 1;
            let style = `width: ${width}ch`
            e.target.setAttribute("style", style);
        }

        let epBeforeInputHandler = (e) => {
            if (e.inputType !== "insertText")
                return;

            let input = parseInt(e.data);
            if (isNaN(input)) {
                e.preventDefault();
            }
        }

        watchedEpCountInput.removeEventListener("change", epChangeHandler);
        watchedEpCountInput.addEventListener("change", epChangeHandler);
        watchedEpCountInput.removeEventListener("input", epInputHandler);
        watchedEpCountInput.addEventListener("input", epInputHandler);
        watchedEpCountInput.removeEventListener("beforeinput", epBeforeInputHandler);
        watchedEpCountInput.addEventListener("beforeinput", epBeforeInputHandler);
        renderWatchedEpCount();

        let epCountSpan = document.getElementById(content.animeId + "-ep-count")
        epCountSpan.textContent = (currentAnime.epCount !== 0) ? currentAnime.epCount : "?";

        let watchedEpCountEdit = document.getElementById(content.animeId + "-watched-count-edit")
        let watchedEpCountEditHandler = () => watchedEpCountInput.focus();

        watchedEpCountEdit.removeEventListener("click", watchedEpCountEditHandler);
        watchedEpCountEdit.addEventListener("click", watchedEpCountEditHandler);
    }
    else
        return content.animeMissingId;
}

content[content.animeMissingId] = async () => {
    let addByUrlInput = document.getElementById(content.animeMissingId + "-add-by-url");

    let handler = async (e) => {
        let result = await backend.setCurrentKeyByUrl(e.target.value);

        if (result !== false)
            await changeContent(content.animeId);
    }

    addByUrlInput.removeEventListener("change", handler);
    addByUrlInput.addEventListener("change", handler);
}

content[content.pageNotMatchedId] = async () => {

}

// STARTUP 

let settingsNav = document.getElementById("settings-nav");
let settingsNavHandler = async () => await changeContent(content.setupId);
settingsNav.addEventListener("click", settingsNavHandler);

let tierListNav = document.getElementById("tier-nav");
let tierListNavHandler = async () => await browser.tabs.create({ url: "../tierlist/tierlist.html" });
tierListNav.addEventListener("click", tierListNavHandler);

if (await backend.setupRequired()) {
    await changeContent(content.animeId);
}
else {
    await changeContent(content.setupId);
}

