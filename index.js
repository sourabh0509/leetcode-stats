const chromium = require("chrome-aws-lambda");

export default class Chrome {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async getBrowserInstance() {
    const executablePath = await chromium.executablePath;
    const options = {
      args: chromium.args,
      headless: true,
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
      ignoreHTTPSErrors: true,
    };

    this.browser = await (!executablePath
      ? require("puppeteer").launch(options)
      : chromium.puppeteer.launch({
          ...options,
          executablePath,
          headless: chromium.headless,
        }));
  }

  async getPage(url, theme) {
    if (!this.browser) {
      await this.getBrowserInstance();
    }
    this.page = await this.browser.newPage();
    await this.page.goto(url);

    if (theme === "dark") {
      await this.page.emulateMediaFeatures([
        {
          name: "prefers-color-scheme",
          value: "dark",
        },
      ]);
    }
  }

  async takeScreenshot(selector, isXPath) {
    let element = await (isXPath
      ? this.page.$x(selector)
      : this.page.$(selector));
    if (Array.isArray(element)) {
      element = element[0];
    }
    const image = await element.screenshot();
    return image;
  }

  async close() {
    await this.browser.close();
  }

  async evaluate(fn) {
    return await this.page.evaluate(fn);
  }
}

async function handler(event) {
  const { username, theme = "light" } = event.queryStringParameters;
  if (!username) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: `Error, no username provided!` }),
    };
  }

  const chrome = new Chrome();
  await chrome.getPage(`https://leetcode.com/${username}`, theme);
  const image = await chrome.takeScreenshot(".min-w-max");

  return {
    statusCode: 200,
    headers: {
      "Content-type": "image/png",
    },
    body: image.toString("base64"),
    isBase64Encoded: true,
  };
}

module.exports = { handler };