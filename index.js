const twofactor = require("node-2fa");
// const { test, expect } = require('@playwright/test');
const { chromium } = require('playwright');
const { ArgumentParser } = require('argparse');
const config = require('./.config.json'); //  ns_account, username, password, tfa_token
// const newSecret = twofactor.generateSecret({ name: "My Awesome App", account: "johndoe" });

// console.log(process.argv)
 
const parser = new ArgumentParser({  description: 'NS Image Uploader' });
parser.add_argument('-f', '--folder', { help: '--folder "Folder > Subfolder > sub subfolder"' , required: true});
parser.add_argument('--headless', { help: 'no browser window',action:'store_const',const:true});
parser.add_argument('documents', { help: '"document1.docx Image2.jpg script3.js"', action:'extend',nargs:"+"});
args = parser.parse_args();

if(typeof args.folder !== 'undefined' ){
  folders = args.folder.split('>').map(e=>e.trim());
}
config.headless = (args.headless == 'undefined') ? false : true;
// console.log(config)
// process.exit(1);

(async () => {

  const browser = await chromium.launch({
  	headless: config.headless, 
  	// slowMo: 50
  });
  const page = await browser.newPage();

  page.on ('close', async () => {
    browser.close();
    process.exit(0);
  });

  await page.goto('https://'+config.ns_account+'.app.netsuite.com/app/login/secure/enterpriselogin.nl?c='+config.ns_account+'&redirect=%2Fapp%2Fcommon%2Fmedia%2Fmediaitemfolders.nl&whence=');

  await page.fill('[placeholder="Email"]', config.username);
  await page.fill('[placeholder="Password"]', config.password);
  await Promise.all([
    page.waitForNavigation({waitUntil:'networkidle'}),
    page.click('text=Log In')
  ]);

  
  if ( await page.isVisible('[placeholder="6-digit code"]')) {
    await page.click('[placeholder="6-digit code"]');
    const newToken = twofactor.generateToken(config.tfa_token);
    await page.fill('[placeholder="6-digit code"]', newToken.token);
    console.log( await page.isVisible('[placeholder="6-digit code"]'));
    await Promise.all([
      page.waitForNavigation(),
      page.click('[aria-label="Submit"]')
    ]);
  }

  // console.log( await page.isVisible('a:has-text("'+folders[0]+'")') );

  folders.forEach( async folder => {
    await page.click('a:has-text("'+folder+'")');
  });

  let documents = args.documents;

  for (var i = 0; i < documents.length; i++) {
    
  
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('#mediafile')
    ]);

    console.log('uploading ' + documents[i]);

    await Promise.all([
      fileChooser.setFiles(documents[i]),
      page.waitForNavigation()
    ]);

  }
  
  await page.close();

})();
