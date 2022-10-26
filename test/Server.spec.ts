import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;
import { expect } from "chai";

import Server from "../src/rest/Server";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import { nextTick } from "process";
import { assert } from "console";

describe("Server Tests", function () {
    // let facade: InsightFacade = null;
    const SERVER_URL = "http://localhost:4321";
    let server: Server = null;

    chai.use(chaiHttp);

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // facade = new InsightFacade();
        server = new Server(4321);

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
            .then((res) => {
                Log.test("Received Server Response");
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
