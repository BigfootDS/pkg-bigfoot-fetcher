# @bigfootds/Bigfoot-Fetcher

JavaScript fetch override for cohesive, consistent usage across various BigfootDS projects.

Note that this package, while publicly available and MIT-licensed, is **not** intended for public contribution/collaboration. We just need an easy way to consolidate some functionality that will be reused across multiple projects, and an NPM package is a nice, easy way to do that.

## Installation

`npm install @bigfootds/bigfoot-fetcher`

## Usage

Import the package as:

```js
import { fetcher } from "@bigfootds/bigfoot-fetcher";
```


Then, use `fetcher` in place of any fetch function calls. It's a wrapper around fetch!

### NodeJS Usage

```js
app.get("/headers", (request, response) => {
    response.json({result: JSON.stringify(request.headers)});
})

fetcher("http://localhost:3030/headers")
    .then(async (response) => {return await response.json()})
    .then((data) => {
        console.log("Returned headers:");
        console.log(data);
    });
```

```
Returned headers:
{
  result: '{"host":"localhost:3030","connection":"keep-alive","osname":"Linux","osversion":"5.15.0-125-generic","platformname":"API","platformtype":"api","productname":"@bigfootds/ms-auth","accept":"*/*","accept-language":"*","sec-fetch-mode":"cors","user-agent":"node","accept-encoding":"gzip, deflate"}'
}
```

### ReactJS Usage

Vite has special config steps that must be done because of the strange way that they handle environment variables.

```js
// vite.config.js

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import packageJson from "./package.json";

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {

  const env = loadEnv(mode, process.cwd(), "");
  let combined = {...env, ...packageJson.bigfootds};
  console.log(combined);

  return {
    plugins: [react()],
    define: {
      'process.env':combined
    }
  }
})
```

```jsx
import './App.css'
import {fetcher} from "@bigfootds/bigfoot-fetcher";

function App() {
  const makeBigfootDSFetch = async () => {
    let result = await fetcher("http://localhost:3030/headers");
    let data = await result.json();
    console.log(data);
  }

  return (
    <>
      <div>
        <button onClick={makeBigfootDSFetch}>
          Make a BigfootDS Fetch Request
        </button>
      </div>
    </>
  )
}

export default App

```

The above returns this to the console:

```
{
    "result": {
        "host": "localhost:3030",
        "connection": "keep-alive",
        "browserengineversion": "131.0.0.0",
        "browserversion": "131.0.0.0",
        "osname": "Windows",
        "browsername": "Chrome",
        "osversion": "10",
        "sec-ch-ua": "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
        "sec-ch-ua-mobile": "?0",
        "browserenginename": "Blink",
        "platformname": "web client",
        "osversionname": "10",
        "platformtype": "desktop",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "dnt": "1",
        "productname": "Super Cool Frontend Website",
        "sec-ch-ua-platform": "\"Windows\"",
        "accept": "*/*",
        "origin": "http://localhost:5173",
        "sec-fetch-site": "same-site",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        "referer": "http://localhost:5173/",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-AU,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
        "if-none-match": "W/\"363-kym2xWPe6ASfGk36ZZ0u32/cuvA\""
    }
}
```

Yes, Windows 11 shows up as Windows 10 - more work can maybe be done in this area but [it requires some more-secure browser context configuration](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/how-to-detect-win11).

Note that the headers above are populated by some default request headers as well as the "Bigfoot Fetcher" headers, which come from a `package.json` contents like this:

```json
{
    "name": "@bigfootds/ms-auth",
     "version": "1.0.1",
    "description": "Core authentication & IAM services for BigfootDS & its various games and products.",
    "config":{
        "bigfootds":{
            "platformType":"api",
            "platformName":"API",
            "productName":"@bigfootds/ms-auth"
        }
    },
    // ...rest of package.json for a NodeJS back-end project
}
```

```json
{
  "name": "vite-testo",
  "private": true,
  "version": "0.0.0",
  "bigfootds": {
    "productName": "Super Cool Frontend Website",
    "platformName":"web client"
  },
  // ...rest of package.json for a front-end project
}
```


These headers are added to all fetch requests that use this package's fetcher function:

```typescript
import { BIGFOOT_FETCHER_HEADER_NAMES } from "@bigfootds/bigfoot-fetcher";

const allowedHeaders = [
  "Content-Type",
  "Authorization",
  ...BIGFOOT_FETCHER_HEADER_NAMES,
];

response.setHeader(
  "Access-Control-Allow-Headers",
  allowedHeaders.join(", ")
);
```


```typescript
interface BigfootDSConfig {
    productName?: string, 
    productVersion?: string,
    browserName?: string,
    browserVersion?: string,
    browserEngineName?: string,
    browserEngineVersion?: string,
    osName?: string,
    osVersion?: string,
    osVersionName?: string,
    platformType?: string, 
    platformName?: string 
}
```

Whether or not they are actually added depends on if they have value, and they don't all have value on all platforms. e.g. no browser properties in the NodeJS environment!
