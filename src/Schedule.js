const puppeteer = require("puppeteer");
const Credentials = require("../Credentials")

module.exports = class Schedule {

    async getScheduleURL() {
        /* Initiate the Puppeteer browser */
        const browser = await puppeteer.launch();//{headless:false,slowMo:500});
        const page = await browser.newPage();
        /* Go to the IMDB Movie page and wait for it to load */
        await page.goto("https://www.dsbmobile.de/Login.aspx#/menu=0&item=0", { waitUntil: 'networkidle0' });
        /* Run javascript inside of the page */
        await page.evaluate((dsb_user, dsb_pass) => {
            document.getElementById("txtUser").value = dsb_user;
            document.getElementById("txtPass").value = dsb_pass;
            document.getElementsByName("ctl03")[0].click();
        }, Credentials.DSB_USERNAME, Credentials.DSB_PASSWORD);
        await page.waitForNavigation({waitUntil: "networkidle0"});
        await page.goto("https://www.dsbmobile.de/Login.aspx#/menu=0&item=1", { waitUntil: 'networkidle0' });
        let img_url = await page.evaluate(() => {
            const tiles = document.querySelectorAll("div.tile");
            for (let i = 0; i < tiles.length; i++) {
                if(tiles[i].innerText.includes("VT")){
                    return "https://dsbmobile.de/data/".concat(
                        tiles[i]
                            .querySelector(".tile-content.absolute-full")
                            .style["backgroundImage"]
                            .match(/(\?f=)(.+\.png)/)[2]
                        );
                }
            }
            return "NOURL";
        }).catch();

        await browser.close();
        return img_url;
    }
}