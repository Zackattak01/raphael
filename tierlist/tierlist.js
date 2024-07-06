import mal from "../mal.js";
const container = document.getElementById("test");
const backend = await browser.runtime.getBackgroundPage();

renderRanks();

const animeList = await mal.getAnimeList();
console.log(animeList);

renderUnrankedAnime();

// instead of stacking the tiers on top of the unranked anime we should just reduce the length of the tiers and put the unranked on the side
// combining tiers 1-3 and maybe 4-5 into a single line may be helpful for space
function renderRanks() {
    const container = document.getElementById("tiers-container");
//    for (let index = 1; index < 11; index++) {
//        const tierElement = document.createElement("div");
//        tierElement.classList.add("tier");
//
//        const numberElement = document.createElement("div");
//        numberElement.textContent = index;
//        tierElement.appendChild(numberElement);
//
//        container.appendChild(tierElement);
//    }

    for (let i = 10; i  > 4; i--) {
        const tierElement = document.createElement("div");
        tierElement.classList.add("tier");

        const numberElement = document.createElement("div");
        numberElement.textContent = i;
        tierElement.appendChild(numberElement);

        container.appendChild(tierElement);
    }

    for (let i = 4; i  > 0; i-=2) {
        const multiTierContainer = document.createElement("div");
        multiTierContainer.classList.add("multi-tier");

        const firstTierElement = document.createElement("div");
        firstTierElement.classList.add("tier");

        let numberElement = document.createElement("div");
        numberElement.textContent = i;
        firstTierElement.appendChild(numberElement);

        const secondTierElement = document.createElement("div");
        secondTierElement.classList.add("tier");

        numberElement = document.createElement("div");
        numberElement.textContent = i - 1;
        secondTierElement.appendChild(numberElement);
        
        multiTierContainer.append(firstTierElement, secondTierElement);

        container.appendChild(multiTierContainer);
    }

}

function renderUnrankedAnime() {
    const container = document.getElementById("unranked-container");

    let index = 0;
    for (const anime of animeList) {
        index++;
        const animeContainer = document.createElement("div");
        animeContainer.classList.add("anime");

        const name = anime.node.alternative_titles.en ? anime.node.alternative_titles.en : anime.node.title;
        const imgElement = document.createElement("img");
        imgElement.setAttribute("src", anime.node.main_picture.medium);
        imgElement.setAttribute("title", name);

        animeContainer.appendChild(imgElement);
        container.appendChild(animeContainer);
    }
}
