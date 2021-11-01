const puppeteer = require("puppeteer");
const Credentials = require("../Credentials")

module.exports = class Schedule {

    async getScheduleURL() {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        try {
            process.stdout.write("Opening DSBMobile... ");
            await page.goto("https://www.dsbmobile.de/Login.aspx#/menu=0&item=0", {waitUntil: 'networkidle0'});
            process.stdout.write("Done\n")
        } catch (e) {
            console.error(e);
            await browser.close();
            return "ERR: Puppeteer failed to open the page."
        }

        try {
            process.stdout.write("Entering Credentials... ");
            await page.evaluate((dsb_user, dsb_pass) => {
                document.getElementById("txtUser").value = dsb_user;
                document.getElementById("txtPass").value = dsb_pass;
                document.getElementsByName("ctl03")[0].click();
            }, Credentials.DSB_USERNAME, Credentials.DSB_PASSWORD);
            process.stdout.write("Done\n");
        } catch (e) {
            console.error(e);
            await browser.close();
            return "ERR: Puppeteer failed to enter the credentials."
        }
        await page.waitForNavigation({waitUntil: "networkidle0"});

        try {
            console.log("Navigating ");
            await page.goto("https://www.dsbmobile.de/Login.aspx#/menu=0&item=1", {waitUntil: 'networkidle0'});
        } catch (e) {
            console.error(e);
            await browser.close();
            return "ERR: Puppeteer failed to navigate to the other view."
        }
        let img_url = "ERR: No value was set for the URL of the schedule.";
        try {
            process.stdout.write("Looking for schedule... ");
            img_url = await page.evaluate(() => {
                const tiles = document.querySelectorAll("div.tile");
                for (let i = 0; i < tiles.length; i++) {
                    if(tiles[i].innerText.includes("VT")){
                        let result = "https://dsbmobile.de/data/".concat(
                            tiles[i]
                                .querySelector(".tile-content.absolute-full")
                                .style["backgroundImage"]
                                .match(/(\?f=)(.+\.png)/)[2]
                            );
                        console.log("Found it! -> " + result);
                        return result;
                    }
                }
                return "ERR: Couldn't find a schedule.";
        })} catch (e) {
            console.error(e);
            await browser.close();
            return "ERR: Puppeteer had problems while trying to find the schedule."
        }

        console.log("Closing Browser")
        await browser.close();
        return img_url;
    }
}