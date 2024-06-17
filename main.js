//Add plugin
const pt = require('puppeteer-extra');
const ExcelJS = require('exceljs');
const {config} = require('./config');

//To bypass bot check
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { config } = require('./config');
pt.use(StealthPlugin())

var globalState = {
    starRating: -1,
    totalReview: -1,
    unitPrice: -1,
    dataScrapped: [],
    promoDataScrapped: [],
}

async function main() {

    const browser = await pt.launch({
        executablePath: config.executablePath,
        headless: false,
        defaultViewport: null,
        userDataDir: config.userDataDir,
        args: ['--start-maximized, --disable-features=site-per-process'],
    });

    var page = await browser.newPage();

    // browser.on('targetcreated', async (target) => {
    //     if (target.type() === 'page') {
    //         const newPage = await target.page();

    //         console.log('test target created 1');

    //         await newPage.waitForFunction(() => document.readyState === 'complete');

    //         console.log('test target created 2');
    //         // Perform actions on the new tab
    //         //await newPage.waitForSelector('.search-results'); // Example selector
    //         // Other actions...
    //     }
    // });

    var url = "https://www.1688.com/";
    var keywords = config.keywords;

    page.setDefaultNavigationTimeout(0);

    const minimumReview = 10;
    const minimumRating = 4.0;
    const maximumPrice = 25.00;
    const pagesToSearch = 5;

    await directToWebsite(page, url);

    const workbook = new ExcelJS.Workbook();

    for (let i = 0; i < keywords.length; i++) {

        await searchKeywords(page, keywords[i]);

        let newPage = await switchCurrentPage(browser, { timeout: 0 });

        await newPage.waitForFunction(() => document.readyState === 'complete', { timeout: 0 });

        //all shirt's url in current page
        var urls = await getShirtsUrl(newPage, maximumPrice);

        //the promo zone (right one) in the page
        var promoUrls = await getPromoUrl(newPage);

        console.log('\nTotal Normal amount: ' + urls.length);
        console.log('Total Promo amount: ' + promoUrls.length + '\n');

        //page to navigate to url
        var pageToScrap = await browser.newPage();

        //Normal
        await dataScrapping(pageToScrap, minimumReview, minimumRating, maximumPrice, urls);

        //Promo
        await dataScrapping(pageToScrap, minimumReview, minimumRating, maximumPrice, promoUrls);

        //await timeout(9999999);
        //await dataScrapping(pageToScrap)

        await writeDataToExcel(workbook, globalState.dataScrapped, keywords[i]);

    }

    await saveExcel(workbook, config.excelPath);
}

async function directToWebsite(page, url) {
    page.goto(url, { timeout: 0 });

}

async function searchKeywords(page, keyword) {
    page.setDefaultNavigationTimeout(0);

    const textareaSelector = '#home-header-searchbox';

    await page.waitForSelector(textareaSelector, { timeout: 0 });
    await page.click(textareaSelector);

    await page.type(textareaSelector, keyword);
    await page.keyboard.press('Enter');
}

async function getShirtsUrl(page, maximumPrice) {

    //the left div
    await page.waitForSelector('.sm-offer');

    const divs = await page.$$('.offer-list > div'); // Get all <div> elements under sm-offer

    const urls = [];
    for (const div of divs) {

        var priceDiv = await div.$('.price');

        if (priceDiv) {
            const unitPrice = await priceDiv.evaluate((node) => {
                const price = parseFloat(node.innerText);
                return price;
            });

            //if <= max price, save into array
            if (unitPrice <= maximumPrice) {
                const a = await div.$('a');

                if (a) {
                    const href = await a.evaluate(node => node.getAttribute('href'));
                    if (href) {
                        urls.push(href);
                    }
                }
            }
        }
    }

    //return array of urls
    return urls;
}

async function getPromoUrl(page) {

    let promoUrls = [];

    await page.waitForSelector('.component');

    //the right div
    const divsRight = await page.$$('.component > div');

    for (const divRightUrl of divsRight) {

        const a = await divRightUrl.$('a');
        if (a) {
            const href = await a.evaluate(node => node.getAttribute('href'));
            if (href) {
                promoUrls.push(href);
            }
        }
    }

    return promoUrls;
}


async function dataScrapping(pageToScrap, minimumReview, minimumRating, maximumPrice, urls) {

    for (let i = 0; i < 5; i++) {

        console.log('Current url: ' + i);

        //go to the website
        directToWebsite(pageToScrap, urls[i], { timeout: 0 });

        //search price first
        await pageToScrap.waitForSelector('.price-content, .activity-price', { timeout: 0 });

        const currentUrl = await pageToScrap.url();

        //Price
        let priceText = await pageToScrap.evaluate(() => {
            const priceTextSpan = document.querySelector('.price-text');

            if (priceTextSpan) {
                return priceTextSpan.textContent;
            }

        })

        var unitPrice = parseFloat(priceText);

        console.log(unitPrice);

        var totalReview = -1;
        var starRating = -1;

        //if price is in range
        if (unitPrice < maximumPrice) {

            const waitForResponses = [
                pageToScrap.waitForResponse(response => response.url().includes('isSignedForTm')),
                pageToScrap.waitForResponse(response => response.url().includes('h5api.m.1688.com/h5/mtop.1688.trade.service.mtoprateservice.querydsrratedatav2/'))
            ];

            const [response1, response2] = await Promise.all(waitForResponses, { timeout: 0 });

            if (response1.url().includes('isSignedForTm')) {

                const responseText_starRating = await response1.text();
                const jsonpRegex_starRating = /mtopjsonp7\((.*)\)/;
                const match_starRating = jsonpRegex_starRating.exec(responseText_starRating);

                if (match_starRating && match_starRating[1] /*1 = partially matches*/) {
                    const jsonData_starRating = match_starRating[1];
                    const responseData_starRating = JSON.parse(jsonData_starRating);

                    starRating = responseData_starRating.data.result.averageStarLevel;
                }
                else {
                    console.log('Failed to extract JSON from JSONP');
                    starRating = -1;
                }

                const responseText_totalReview = await response2.text();
                const jsonpRegex_totalReview = /mtopjsonp8\((.*)\)/;
                const match_totalReview = jsonpRegex_totalReview.exec(responseText_totalReview);

                if (match_totalReview && match_totalReview[1] /*1 = partially matches*/) {
                    const jsonData_totalReview = match_totalReview[1];
                    const responseData_totalReview = JSON.parse(jsonData_totalReview);

                    // Use optional chaining to safely access nested properties
                    const totalReviewCount = responseData_totalReview?.data?.model?.commonTagNodeList?.[0]?.count;

                    if (totalReviewCount !== undefined) {
                        totalReview = totalReviewCount;
                    } else {
                        totalReview = -1;
                    }

                }
                else {
                    console.log('Failed to extract JSON from JSONP');
                    totalReview = -1;
                }
            }

            console.log('Price: ' + unitPrice);
            console.log('Star level: ' + starRating);
            console.log('total review: ' + totalReview);


            if (totalReview > minimumReview && starRating > minimumRating) {

                await pageToScrap.waitForSelector('.title-text', { timeout: 0 });

                const titleText = await pageToScrap.evaluate(() => {

                    const titleElement = document.querySelector('.title-text');

                    return titleElement.textContent;

                });

                globalState.dataScrapped.push({ title: titleText, price: unitPrice, stars: starRating, numberOfReviews: totalReview, url: currentUrl });
            }

            console.log(globalState.dataScrapped);

            //await timeout(999999);
            //check min rating

        }

        await timeout((Math.floor(Math.random() * 3) + 3) * 1000);

    }
}

async function switchCurrentPage(browser) {

    return new Promise((resolve, reject) => {

        const responseHandler = async (response) => {
            if (response.type() === 'page') {
                const newPage = await response.page(); // Get the new page object
                resolve(newPage);
                console.log('Switched page!');
            }

        }

        browser.on('targetcreated', responseHandler);
    })
}


async function writeDataToExcel(workbook, data, searchKeyword) {

    const worksheet = workbook.addWorksheet(searchKeyword);

    // Define columns
    worksheet.columns = [
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Price', key: 'price', width: 10 },
        { header: 'Stars', key: 'stars', width: 10 },
        { header: 'Number of Reviews', key: 'numberOfReviews', width: 20 },
        { header: 'URL', key: 'url', width: 40 }
    ];

    data.forEach(item => {
        worksheet.addRow(item);
    });
}

async function saveExcel(workbook, filePath) {

    await workbook.xlsx.writeFile(filePath);
    console.log(`Data written to ${filePath}`);
}

async function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


//testBot();
main();