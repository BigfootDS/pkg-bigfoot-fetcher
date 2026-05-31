import Bowser from "bowser";
import MyUaParser from "my-ua-parser";

export const BIGFOOT_FETCHER_HEADER_NAMES = [
    "productName",
    "productVersion",
    "browserName",
    "browserVersion",
    "browserEngineName",
    "browserEngineVersion",
    "osName",
    "osVersion",
    "osVersionName",
    "platformType",
    "platformName",
] as const;

export type BigfootFetcherHeaderName = typeof BIGFOOT_FETCHER_HEADER_NAMES[number];

const PLATFORM_TYPE_ENV_KEYS = [
    "npm_package_config_bigfootds_platformType",
    "npm_package_platformType",
    "platformType",
    "PLATFORMTYPE",
    "PLATFORM_TYPE",
    "REACT_APP_PLATFORM_TYPE",
    "REACT_APP_PLATFORMTYPE",
    "VITE_PLATFORM_TYPE",
    "VITE_PLATFORMTYPE",
] as const;

const PLATFORM_NAME_ENV_KEYS = [
    "npm_package_config_bigfootds_platformName",
    "npm_package_platformName",
    "platformName",
    "PLATFORMNAME",
    "PLATFORM_NAME",
    "REACT_APP_PLATFORM_NAME",
    "REACT_APP_PLATFORMNAME",
    "VITE_PLATFORM_NAME",
    "VITE_PLATFORMNAME",
] as const;

const PRODUCT_NAME_ENV_KEYS = [
    "npm_package_config_bigfootds_productName",
    "npm_package_productName",
    "productName",
    "PRODUCTNAME",
    "PRODUCT_NAME",
    "REACT_APP_PRODUCT_NAME",
    "REACT_APP_PRODUCTNAME",
    "VITE_PRODUCT_NAME",
    "VITE_PRODUCTNAME",
] as const;

const PRODUCT_VERSION_ENV_KEYS = [
    "npm_package_config_bigfootds_productVersion",
    "npm_package_productVersion",
    "productVersion",
    "PRODUCTVERSION",
    "PRODUCT_VERSION",
    "REACT_APP_PRODUCT_VERSION",
    "REACT_APP_PRODUCTVERSION",
    "VITE_PRODUCT_VERSION",
    "VITE_PRODUCTVERSION",
    "npm_package_version",
] as const;

const NODE_OS_NAMES: Record<string, string> = {
    aix: "AIX",
    darwin: "Darwin",
    freebsd: "FreeBSD",
    linux: "Linux",
    openbsd: "OpenBSD",
    sunos: "SunOS",
    win32: "Windows_NT",
};

interface NodeReportHeader {
    osName?: string;
    osRelease?: string;
    osVersion?: string;
}

let cachedNodeReportHeader: NodeReportHeader | null | undefined;


/**
 * Custom extension of the built-in JavaScript `fetch` function. Takes the same parameters as `fetch`, but adds a set of headers to every request.
 * 
 * @author BigfootDS
 *
 * @export
 * @param {RequestInfo | URL} requestTarget Preferably just a regular string URL, please.
 * @param {RequestInit} [options] Fetch options. See {@link https://developer.mozilla.org/en-US/docs/Web/API/RequestInit RequestInit} at MDN Web Docs for more info.
 * @returns The executing `fetch` function configured with standard BigfootDS-relevant headers.
 */
export function fetcher(requestTarget: RequestInfo | URL, options: RequestInit = {}): Promise<Response> {
    const headers = createHeaders(requestTarget, options.headers);
    const bigfootDSConfigData = isBrowserRuntime()
        ? getInfoViaBrowser()
        : getInfoViaNode();

    for (const key of BIGFOOT_FETCHER_HEADER_NAMES) {
        const value = bigfootDSConfigData[key];

        if (value !== undefined && value !== "") {
            headers.set(key, value);
        }
    }

    return fetch(requestTarget, {
        ...options,
        headers,
    });
}

function createHeaders(requestTarget: RequestInfo | URL, optionHeaders: HeadersInit | undefined): Headers {
    const headers = new Headers(
        isRequest(requestTarget) ? requestTarget.headers : undefined
    );

    if (optionHeaders !== undefined) {
        new Headers(optionHeaders).forEach((value, key) => {
            headers.set(key, value);
        });
    }

    return headers;
}

function isRequest(value: RequestInfo | URL): value is Request {
    return typeof Request !== "undefined" && value instanceof Request;
}

function isNodeRuntime(): boolean {
    try {
        return typeof process !== "undefined" && process.versions?.node !== undefined;
    } catch {
        return false;
    }
}

function isBrowserRuntime(): boolean {
    return typeof window !== "undefined" || (typeof self !== "undefined" && !isNodeRuntime());
}

function getInfoViaBrowser(): BigfootDSConfig {
    const userAgent = globalThis.navigator?.userAgent ?? "";
    const browser = Bowser.getParser(userAgent);
    const bowserResult = browser.getResult();
    const userAgentParsed = MyUaParser(userAgent);

    const result: BigfootDSConfig = {
        browserEngineName: 
            bowserResult.engine.name ||
            userAgentParsed.engine.name,
        browserEngineVersion: 
            bowserResult.engine.version || 
            userAgentParsed.engine.version,
        browserName: 
            bowserResult.browser.name || 
            userAgentParsed.browser.name,
        browserVersion: 
            bowserResult.browser.version ||
            userAgentParsed.browser.version,
        osName: 
            bowserResult.os.name ||
            userAgentParsed.os.name,
        osVersion: 
            userAgentParsed.os.version|| 
            bowserResult.os.version,
        osVersionName: 
            userAgentParsed.os.version || 
            bowserResult.os.versionName,
        platformType: 
            readEnv(PLATFORM_TYPE_ENV_KEYS) ||
            bowserResult.platform.type,
        platformName:
            readEnv(PLATFORM_NAME_ENV_KEYS),
        productName:
            readEnv(PRODUCT_NAME_ENV_KEYS),
        productVersion:
            readEnv(PRODUCT_VERSION_ENV_KEYS),
    }

    return result;
}

function getInfoViaNode(): BigfootDSConfig {
    const platform = readProcessPlatform();
    const reportHeader = readProcessReportHeader();

    const result: BigfootDSConfig = {
        osName: 
            reportHeader?.osName ||
            (platform === undefined ? undefined : NODE_OS_NAMES[platform] ?? platform),
        osVersion:
            reportHeader?.osRelease,
        osVersionName:
            reportHeader?.osVersion,
        platformType: 
            readEnv(PLATFORM_TYPE_ENV_KEYS),
        platformName:
            readEnv(PLATFORM_NAME_ENV_KEYS),
        productName:
            readEnv(PRODUCT_NAME_ENV_KEYS),
        productVersion:
            readEnv(PRODUCT_VERSION_ENV_KEYS),
    }

    return result;
}

function readEnv(keys: readonly string[]): string | undefined {
    for (const key of keys) {
        const value = readProcessEnv(key);

        if (value !== undefined && value !== "") {
            return value;
        }
    }

    return undefined;
}

function readProcessEnv(key: string): string | undefined {
    try {
        return process.env[key];
    } catch {
        return undefined;
    }
}

function readProcessPlatform(): string | undefined {
    try {
        return process.platform;
    } catch {
        return undefined;
    }
}

function readProcessReportHeader(): NodeReportHeader | undefined {
    if (cachedNodeReportHeader !== undefined) {
        return cachedNodeReportHeader ?? undefined;
    }

    try {
        const report = process.report?.getReport?.() as { header?: NodeReportHeader } | undefined;
        cachedNodeReportHeader = report?.header ?? null;
    } catch {
        cachedNodeReportHeader = null;
    }

    return cachedNodeReportHeader ?? undefined;
}


export interface BigfootDSConfig {
    // Set in package.json, access with properties like `process.env.npm_package_config_bigfootds_productName`:
	productName?: string, 
    productVersion?: string, // also retrievable as environment variable

    // Retrievable via Bowser NPM package:
    browserName?: string,
    browserVersion?: string,
    browserEngineName?: string,
    browserEngineVersion?: string,
    osName?: string,
    osVersion?: string,
    osVersionName?: string,
    platformType?: string, // also retrievable as environment variable

    // Retrievable as environment variables:
    platformName?: string // set as environment variable, preferably at build time in a GitHub Action workflow
}

// In a browser with a correct meta HTML tag, this natively gets some device info: 
// await navigator.userAgentData.getHighEntropyValues(["architecture","bitness","formFactor","fullVersionList","model","platformVersion","uaFullVersion","wow64"])
/*
{
    "architecture": "x86",
    "bitness": "64",
    "brands": [
        {
            "brand": "Google Chrome",
            "version": "131"
        },
        {
            "brand": "Chromium",
            "version": "131"
        },
        {
            "brand": "Not_A Brand",
            "version": "24"
        }
    ],
    "fullVersionList": [
        {
            "brand": "Google Chrome",
            "version": "131.0.6778.86"
        },
        {
            "brand": "Chromium",
            "version": "131.0.6778.86"
        },
        {
            "brand": "Not_A Brand",
            "version": "24.0.0.0"
        }
    ],
    "mobile": false,
    "model": "",
    "platform": "Windows",
    "platformVersion": "15.0.0",
    "uaFullVersion": "131.0.6778.86",
    "wow64": false
}
*/
// There is a quirk on Windows 11; it must be detected in a certain way!
// https://learn.microsoft.com/en-us/microsoft-edge/web-platform/how-to-detect-win11

// ElectronJS can set a user agent like so:
// https://stackoverflow.com/questions/35672602/how-to-set-electron-useragent

// Set environment variables in GitHub Actions workflows like so:
// https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables
