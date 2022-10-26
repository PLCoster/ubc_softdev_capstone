import { promises as fs } from "fs";
import chai = require("chai");
import chaiHttp = require("chai-http");
import { expect } from "chai";

import Response = ChaiHttp.Response;

import {
    InsightResponseSuccessBody,
    InsightResponseErrorBody,
} from "../src/controller/IInsightFacade";

import Server from "../src/rest/Server";
import { CACHE_PATH } from "../src/controller/DatasetLoader";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

describe("Server Tests", function () {
    // let facade: InsightFacade = null;
    const SERVER_URL = "http://localhost:4321";
    let server: Server = null;

    chai.use(chaiHttp);

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // facade = new InsightFacade();
        server = new Server(4321);

        // Check if caching directory exists, delete it if it does:
        try {
            await fs.access(CACHE_PATH);
            Log.trace("Deleting Dataset Cache Prior to Server Tests");
            await fs.rmdir(CACHE_PATH, { recursive: true }).catch((err) => {
                const errMessage = `ERROR WHEN TRYING TO DELETE EXISTING CACHE PRIOR TO TESTING: ${err}`;
                Log.error(errMessage);
                expect.fail(errMessage);
            });
            Log.trace("Dataset Cache Deleted");
        } catch (err) {
            // fs.access throws an error if directory does not exist
            Log.trace(
                "Confirmed DatasetLoader Cache is Empty Before Running Tests",
            );
        }

        // Start up the Server
        try {
            await server.start();
        } catch (err) {
            const errMessage = `Error in before hook when trying to start server: ${JSON.stringify(
                err,
            )}`;
            Log.error(errMessage);
            expect.fail(errMessage);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(async function () {
        Log.test(`After: ${this.test.parent.title}`);

        try {
            await server.stop();
            Log.test(`Server closed after running Server tests`);
        } catch (err) {
            Log.error(`ERROR WHEN TRYING TO STOP SERVER AFTER TESTING: ${err}`);
        }
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("GET /echo/:msg -> Returns Echo of Sent Message", function () {
        const message = "hello world";
        const expectedResponse = { result: `${message}...${message}` };

        return chai
            .request(SERVER_URL)
            .get(`/echo/${message}`)
            .then((res: Response) => {
                expect(res.status).to.equal(
                    200,
                    "Response status should be 200",
                );
                expect(res.type).to.equal(
                    "application/json",
                    "Response body type should be JSON",
                );

                expect(res.body).to.deep.equal(
                    expectedResponse,
                    "Response body should have result key with echo message",
                );
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(err);
            });
    });

    it("PUT /dataset/:id/:kind -> Loads a valid courses dataset, if ID not already loaded", function () {
        const id = "courses";
        const kind = "courses";
        const filePath = "./test/data/courses/courses.zip";
        Log.trace(`${__dirname}`);

        const expectedResponse: InsightResponseSuccessBody = {
            result: [id, kind, 100],
        };

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/courses/courses`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed");
            })
            .then((res: Response) => {
                expect(res.status).to.equal(
                    204,
                    "Response status should be 204",
                );
                expect(res.type).to.equal(
                    "application/json",
                    "Response body type should be JSON",
                );

                expect(res.body).to.deep.equal(
                    expectedResponse,
                    "Response body should have result key with data about successfully loaded dataset",
                );
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(err);
            });
    });

    // Sample on how to format PUT requests
    /*
    it("PUT test for courses dataset", function () {
        try {
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    */

    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
