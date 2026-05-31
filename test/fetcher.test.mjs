import assert from "node:assert/strict";
import test from "node:test";

import { BIGFOOT_FETCHER_HEADER_NAMES, fetcher } from "../dist/index.js";

const TEST_ENV = {
    npm_package_config_bigfootds_platformName: "Fetcher Test Platform",
    npm_package_config_bigfootds_platformType: "test-client",
    npm_package_config_bigfootds_productName: "Fetcher Test Product",
    npm_package_config_bigfootds_productVersion: "9.8.7",
};

test("exports the Bigfoot fetcher header names", () => {
    assert.deepEqual(BIGFOOT_FETCHER_HEADER_NAMES, [
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
    ]);
});

for (const { name, headers } of [
    {
        name: "plain object headers",
        headers: {
            accessToken: "plain-access-token",
            refreshToken: "plain-refresh-token",
        },
    },
    {
        name: "Headers instance",
        headers: new Headers([
            ["accessToken", "headers-access-token"],
            ["refreshToken", "headers-refresh-token"],
        ]),
    },
    {
        name: "tuple headers",
        headers: [
            ["accessToken", "tuple-access-token"],
            ["refreshToken", "tuple-refresh-token"],
        ],
    },
]) {
    test(`preserves ${name} and adds Bigfoot headers`, async () => {
        await withTestEnv(async () => {
            await withCapturedFetch(async (calls) => {
                const options = { headers };

                await fetcher("https://example.test/resource", options);

                assert.equal(calls.length, 1);
                assert.equal(options.headers, headers);

                const capturedHeaders = new Headers(calls[0].init.headers);
                assert.equal(capturedHeaders.get("accessToken"), new Headers(headers).get("accessToken"));
                assert.equal(capturedHeaders.get("refreshToken"), new Headers(headers).get("refreshToken"));
                assertBigfootHeaders(capturedHeaders);
            });
        });
    });
}

test("preserves Request headers and option headers together", async () => {
    await withTestEnv(async () => {
        await withCapturedFetch(async (calls) => {
            const request = new Request("https://example.test/request", {
                headers: {
                    accessToken: "request-access-token",
                },
            });
            const options = {
                headers: {
                    refreshToken: "option-refresh-token",
                },
            };

            await fetcher(request, options);

            assert.equal(calls.length, 1);
            assert.equal(calls[0].input, request);
            assert.deepEqual(options.headers, {
                refreshToken: "option-refresh-token",
            });

            const capturedHeaders = new Headers(calls[0].init.headers);
            assert.equal(capturedHeaders.get("accessToken"), "request-access-token");
            assert.equal(capturedHeaders.get("refreshToken"), "option-refresh-token");
            assertBigfootHeaders(capturedHeaders);
        });
    });
});

function assertBigfootHeaders(headers) {
    assert.equal(headers.get("platformName"), TEST_ENV.npm_package_config_bigfootds_platformName);
    assert.equal(headers.get("platformType"), TEST_ENV.npm_package_config_bigfootds_platformType);
    assert.equal(headers.get("productName"), TEST_ENV.npm_package_config_bigfootds_productName);
    assert.equal(headers.get("productVersion"), TEST_ENV.npm_package_config_bigfootds_productVersion);
    assert.ok(headers.get("osName"));
    assert.ok(headers.get("osVersion"));
}

async function withCapturedFetch(callback) {
    const originalFetch = globalThis.fetch;
    const calls = [];

    globalThis.fetch = async (input, init = {}) => {
        calls.push({ input, init });
        return new Response(null, { status: 204 });
    };

    try {
        await callback(calls);
    } finally {
        globalThis.fetch = originalFetch;
    }
}

async function withTestEnv(callback) {
    const originalValues = new Map(
        Object.keys(TEST_ENV).map((key) => [key, process.env[key]])
    );

    Object.assign(process.env, TEST_ENV);

    try {
        await callback();
    } finally {
        for (const [key, value] of originalValues) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    }
}
