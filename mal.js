let clientId = "927e5793e4c0fb5042dab3af19e0607b"
let apiUrl = "https://api.myanimelist.net/v2"
let oauthUrl = `https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=${clientId}` 
let tokenUrl = "https://myanimelist.net/v1/oauth2/token" 
let authOptions = null;

window.login = async () => { 
    let auth = await mal.authenticateUser();

    await setAuth(auth);
}

window.isAuthed = async () => { 
    let storage = await browser.storage.local.get();
    return storage.auth ? true : false;
}

// TODO use better code generation
function dec2hex(dec) {
    return ("0" + dec.toString(16)).substr(-2);
}

function generateCodeVerifier() {
    var array = new Uint32Array(56 / 2);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec2hex).join("");
}

async function setAuth(auth) {
    let storage = await browser.storage.local.get();

    storage.auth = { refreshToken: auth.refresh_token };
    await browser.storage.local.set(storage);

    authOptions = { 
        headers: {
            "Authorization": auth.token_type + " " + auth.access_token
        }
    }

}

async function refreshAuth() {
    let storage = await browser.storage.local.get();

    if (!storage.auth)
    {
        console.error("Need to reauthenticate with MAL");
        return;
    }

    let reqBody = new URLSearchParams();
    reqBody.append("client_id", clientId);
    reqBody.append("grant_type", "refresh_token");
    reqBody.append("refresh_token", storage.auth.refreshToken);

    let resp = await fetch(tokenUrl, { method: "POST", body: reqBody });
    let auth = await resp.json();
    console.log(auth);
    await setAuth(auth);
    return authOptions;
}

async function makeRequest(url, options) {
    authOptions ??= await refreshAuth();
    if (!authOptions) {
        console.error("Could not get auth");
        return;
    }

    if (options)
        options.headers = authOptions.headers;
    else
        options = authOptions;

    // todo: refresh logic
    let resp = await fetch(url, options);
    return await resp.json();
}

let mal = {};

mal.authenticateUser = async () => {
    let challengeCode = generateCodeVerifier();
    let url = oauthUrl + "&code_challenge=" + challengeCode;
    let redirectUrl = await browser.identity.launchWebAuthFlow({ url: url, interactive: true });
    let params = redirectUrl.split("?")[1];
    let code = new URLSearchParams(params).get("code");

    let reqBody = new URLSearchParams();
    reqBody.append("client_id", clientId);
    reqBody.append("grant_type", "authorization_code");
    reqBody.append("code", code);
    reqBody.append("code_verifier", challengeCode);

    let resp = await fetch(tokenUrl, { method: "POST", body: reqBody });
    return await resp.json();
}

mal.searchAnime = async (query) => {
    // mal appears to have an undocumented limit of the query length
    if (query.length > 64)
        query = query.substring(0, 64);
        
    let url = apiUrl + `/anime?q=${encodeURIComponent(query)}&limit=1`
    console.log(url);
    let resp = await makeRequest(url, { method: "GET" });
    console.log(resp);
    return resp.data[0].node;
}

mal.getAnime = async (id) => {
    let url = apiUrl + `/anime/${id}?fields=id,title,main_picture,alternative_titles,num_episodes,my_list_status`;
    let resp = await makeRequest(url, { method: "GET" });
    console.log(resp);
    return resp;
}

mal.getIdFromUrl = (url) => {
    const regex = /myanimelist.net\/anime\/(?<id>\d*)\//g
    let result = regex.exec(url);

    if (!result || !result.groups || !result.groups.id)
        return;

    return result.groups.id;
}

mal.getUser = async () => {
    let url = apiUrl + "/users/@me";
    return await makeRequest(url, { method: "GET" });
}

mal.getAnimeList = async () => {
    const url = apiUrl + "/users/@me/animelist?status=completed&nsfw=true&fields=list_status,alternative_titles&limit=1000";
    const resp = await makeRequest(url, { method: "GET" });

    return resp.data;
}

mal.updateAnimeList = async (animeId, options) => {
    let url = apiUrl + `/anime/${animeId}/my_list_status`

    let reqBody = new URLSearchParams();

    if (options.status)
        reqBody.append("status", options.status);

    if (options.epCount)
        reqBody.append("num_watched_episodes", options.epCount);

    if (options.score >= 0 && options.score <= 10)
        reqBody.append("score", options.score);

    return await makeRequest(url, { method: "PATCH", body: reqBody });
}



export default mal;
