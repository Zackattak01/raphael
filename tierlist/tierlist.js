import mal from "../mal.js";
const backend = await browser.runtime.getBackgroundPage();

const animeList = await mal.getAnimeList();
console.log(animeList);

const unrankedAnime = {};
const rankedAnime = {};
mapAnimeObjects();


renderRanks();


renderUnrankedAnime();

function dragOverHandler(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
}

function mapAnimeObjects() {
    for (const anime of animeList) {
        const mappedAnime = {
            id: anime.node.id,
            title: anime.node.alternative_titles.en ? anime.node.alternative_titles.en : anime.node.title,
            coverUrl: anime.node.main_picture.medium,
            score: anime.list_status.score
        }

        if (anime.score > 0)
            rankedAnime[mappedAnime.id] = mappedAnime;
        else
            unrankedAnime[mappedAnime.id] = mappedAnime;
    }

}

function renderRanks() {
    const container = document.getElementById("tiers-container");


    const dropHandler = (tier) => (e) => {
        e.preventDefault();

        const id = e.dataTransfer.getData("text/plain");

        const tierContainer = document.getElementById(tier);
        const animeContainer = document.getElementById(id);

        if (animeContainer.parentElement !== tierContainer)
        {
            tierContainer.appendChild(animeContainer);

            if (unrankedAnime[id]) {
                const anime = unrankedAnime[id];
                unrankedAnime[id] = undefined;
                rankedAnime[id] = anime;
            }        
        }

    }

    for (let i = 10; i  > 4; i--) {
        const tierElement = document.createElement("div");
        tierElement.setAttribute("id", i);
        tierElement.classList.add("tier");
        tierElement.addEventListener("dragover", dragOverHandler);
        tierElement.addEventListener("drop", dropHandler(i));

        const numberElement = document.createElement("div");
        numberElement.textContent = i;
        tierElement.appendChild(numberElement);

        container.appendChild(tierElement);
    }

    let multiTierContainer;
    for (let i = 4; i  > 0; i--) {
        if (!multiTierContainer) {
            multiTierContainer = document.createElement("div");
            multiTierContainer.classList.add("multi-tier");
        }
        
        const tierElement = document.createElement("div");
        tierElement.setAttribute("id", i);
        tierElement.classList.add("tier");
        tierElement.addEventListener("dragover", dragOverHandler);
        tierElement.addEventListener("drop", dropHandler(i));

        const numberElement = document.createElement("div");
        numberElement.textContent = i;
        tierElement.appendChild(numberElement);
        
        multiTierContainer.appendChild(tierElement);

        if ((i+1) % 2 === 0 && multiTierContainer)
        {
            container.appendChild(multiTierContainer);
            multiTierContainer = null;
        }
    }
}

function renderUnrankedAnime() {
    const container = document.getElementById("unranked-container");
    container.textContent = "";

    const dropHandler = (e) => {
        e.preventDefault();

        const id = e.dataTransfer.getData("text/plain");

        const animeContainer = document.getElementById(id);

        if (animeContainer.parentElement !== container)
        {
            if (rankedAnime[id]) {
                const anime = rankedAnime[id];
                rankedAnime[id] = undefined;
                unrankedAnime[id] = anime;
            }        

            animeContainer.remove();
            renderUnrankedAnime();
        }

    }

    container.removeEventListener("dragover", dragOverHandler);
    container.addEventListener("dragover", dragOverHandler);
    container.removeEventListener("drop", dropHandler);
    container.addEventListener("drop", dropHandler);

    const dragStartHandler = (id) => (e) => {
        e.dataTransfer.setData("text/plain", id);
    }

    let index = 0;
    const sortedAnime = Object.values(unrankedAnime).sort((a,b) => a.title.localeCompare(b.title));
    
    for (const anime of sortedAnime) {
        index++;
        const animeContainer = document.createElement("div");
        animeContainer.setAttribute("id", anime.id);
        animeContainer.setAttribute("draggable", true);
        animeContainer.classList.add("anime");
        animeContainer.addEventListener("dragstart", dragStartHandler(anime.id));

        const imgElement = document.createElement("img");
        imgElement.setAttribute("src", anime.coverUrl);
        imgElement.setAttribute("title", anime.title);

        animeContainer.appendChild(imgElement);
        container.appendChild(animeContainer);
    }
}
