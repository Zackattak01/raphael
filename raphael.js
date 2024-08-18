import mal from "./mal.js";

//                          w   d   h    m    s    ms
const infoRefreshInterval = 1 * 7 * 24 * 60 * 60 * 1000;

let storage = await browser.storage.local.get();
var parsing;
if (!storage.parsing) {
    storage.parsing = { pagePatterns: [], replacers: [] }
}

await browser.storage.local.set(storage);
parsing = storage.parsing;


browser.tabs.onActivated.addListener(tabActivated);
browser.tabs.onUpdated.addListener(tabUpdated, { properties: ["url"] });
browser.windows.onFocusChanged.addListener(windowFocusChanged);

let lastAnime;

window.setupRequired = async () => (await window.isAuthed()) && parsing.pagePatterns.length > 0;

window.getParsingInfo = async () => {
    let storage = await browser.storage.local.get();
    return storage.parsing;
}

window.setParsingInfo = async (info) => {
    let storage = await browser.storage.local.get();

    storage.parsing = info;
    parsing = storage.parsing;

    await browser.storage.local.set(storage);
}

window.getCurrentAnime = async () => {
    if (!lastAnime)
        return;

    if (!lastAnime.malId) {
        await mapMalInfoToAnime(lastAnime);
    }

    return lastAnime;
}

window.getTrackingData = async () => {
    const storage = await browser.storage.local.get();

    return storage.data;
}

window.setTrackingState = async (anime) => {
    if (!anime.malId) {
        console.error("Tried to track an anime with no mal id");
        return;
    }
    
    anime.tracking = !anime.tracking;

    await saveAnime(anime);
}

window.setEpisodeCount = async (anime, newEpCount) => {
    setEpisodeCount(anime, newEpCount);
    await saveAnime(anime);
}

window.setCurrentKeyByUrl = async (url) => {
    if (!lastAnime)
        return false;

    let id = mal.getIdFromUrl(url);
    if (!id)
    {
        console.error("Couldnt get id from url");
        return false;
    }


    await mapMalInfoToAnime(lastAnime, id);
    await saveAnime(lastAnime);
}

window.markAnimeInfoIncorrect = async (anime) => {
    anime.malId = null;
    anime.failedToSearchMalInfo = true;
    anime.tracking = false;

    await saveAnime(anime);
}

window.deleteAnime = deleteAnime;

async function tabActivated(evt) {
    let tab = await browser.tabs.get(evt.tabId);
    if (tab.url)
        parseUrl(tab.url);
}

function tabUpdated(_, __, tab) {
    if (tab.url)
        parseUrl(tab.url);
}

async function windowFocusChanged(windowId) {
    if (windowId === browser.windows.WINDOW_ID_NONE)
        return;

    let tabs = await browser.tabs.query({ currentWindow: true });
    let tab = tabs.find(x => x.active);
    if (tab && tab.url)
        parseUrl(tab.url);
}

function parseUrl(url) {
    //let regex = /aniwave\.to\/watch\/(?<key>.*)\..*\/ep-(?<ep>\d*)/g;

    let result;// = regex.exec(url);
    for (const pattern of parsing.pagePatterns) {
        console.log("trying pattern " + pattern + " on str: " + url);
        result = new RegExp(pattern).exec(url);
        if (result)
            break;
    }
    console.log(result);

    if (!result || !result.groups || !result.groups.key || !result.groups.ep) {
        lastAnime = null;
        return;
    } else {
        let key = result.groups.key;

        let name = result.groups.key;
        for (const replacer of parsing.replacers)
        {
            //name = result.groups.key.replaceAll("-", " ");
            name = name.replaceAll(replacer.pattern, replacer.value);
        }
        
        let ep = parseInt(result.groups.ep);
        addEpisode(key, name, ep)
    }
}

async function addEpisode(key, name, ep) {
    let storage = await browser.storage.local.get();
    
    if (!storage.data)
    {
        storage.data = newData();
    }

    let anime = storage.data.anime[key];
    if (!anime)
    {
        anime = newAnime(key, name, ep);
    }
    else if (!anime.eps.includes(ep))
    {
        anime.eps.push(ep);
    }

    let timeSinceInfoFetch = Date.now() - anime.infoFetchDate;
    if (!anime.malId || !anime.infoFetchDate || timeSinceInfoFetch >= infoRefreshInterval)
        await mapMalInfoToAnime(anime);


    lastAnime = anime;
    await saveAnime(anime, storage);
}

function setEpisodeCount(anime, newEpCount) {
    if (newEpCount < 0)
        return;

    if (anime.epCount != 0 && newEpCount > anime.epCount)
        newEpCount = anime.epCount;

    let difference = newEpCount - anime.eps.length;

    let indexToAttempt = 1;
    while (difference > 0) {
        if (!anime.eps.includes(indexToAttempt)) {
            anime.eps.push(indexToAttempt);
            difference--;
        }

        indexToAttempt++;
    }

    while (difference < 0) {
        anime.eps.pop();
        difference++;
    }
}

async function saveAnime(anime, storage = null) {
    if (!anime.key) {
        console.error("Tried to save something this is not an anime");
        return;
    }

    storage ??= await browser.storage.local.get();
    
    storage.data.anime[anime.key] = anime;
    await browser.storage.local.set(storage);

    await syncAnime(anime);
}

async function deleteAnime(anime) {
    let storage = await browser.storage.local.get();

    storage.data.anime[anime.key] = undefined;
    await browser.storage.local.set(storage);
}

async function syncAnime (anime) {
    if (anime.tracking) {
        if (!anime.malId) {
            console.error("Need mal info to sync anime");
            return;
        }

        const options = {
            epCount: anime.eps.length,
            status: anime.eps.length === anime.epCount ? "completed" : "watching"
        }

        await mal.updateAnimeList(anime.malId, options);
    }
}

async function mapMalInfoToAnime(anime, id = null) {
    console.log("remap");
    try {
        if (id === null && anime.malId)
            id = anime.malId
        else if (id === null && !anime.failedToSearchMalInfo) {
            let result = await mal.searchAnime(anime.name);
            id = result.id
        }
        else if (id === null)
            return;


        let malInfo = await mal.getAnime(id);

        anime.infoFetchDate = Date.now();

        anime.malId = malInfo.id;

        if (malInfo.alternative_titles && malInfo.alternative_titles.en)
            anime.name = malInfo.alternative_titles.en;
        else
            anime.name= malInfo.title;

        anime.coverUrl = malInfo.main_picture.medium;
        anime.epCount = malInfo.num_episodes;

        if (!malInfo.my_list_status)
            return;

        setEpisodeCount(anime, malInfo.my_list_status.num_episodes_watched);


    } catch (error) {
        anime.failedToSearchMalInfo = true;
        console.error("Encountered an error while mapping mal info" + error);
    }
}


function newData() {
    return {
        "anime": {}
    };
}

function newAnime(key, name, ep) {
    return {
        "key": key,
        "name": name,
        "eps": [ep],
        "tracking": false
    };
}


