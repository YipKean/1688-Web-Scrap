const { default: puppeteer } = require('puppeteer');

//Add plugin
const pt = require('puppeteer-extra');

//To bypass bot check
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
pt.use(StealthPlugin())

async function checkBotDetection(){

    const browser = await pt.launch(
        {
            headless: true,
            defaultViewport: null,
            args: ['--start-maximized'],
        }
    );

    const page = await browser.newPage();
    
    await page.goto('https://bot.sannysoft.com/');

    await page.screenshot({path: 'headlessTrue-Extra.png', fullPage: true});

    //await browser.close();

    console.log('All  done!')

}

checkBotDetection();