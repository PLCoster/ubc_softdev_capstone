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

    // ECHO ROUTE TESTS

    it("GET /echo/:msg -> Returns Echo of Sent Message", function () {
        const message = "hello world";
        const expectedResponse = { result: `${message}...${message}` };

        return chai
            .request(SERVER_URL)
            .get(`/echo/${message}`)
            .then((res: Response) => {
                Log.test(
                    `Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );

                expect(res.status).to.equal(
                    200,
                    "Response status should be 200",
                );

                expect(res.body).to.deep.equal(
                    expectedResponse,
                    "Response body should have result key with echo message",
                );
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    // PUT ROUTE TESTS

    it("PUT /dataset/:id/:kind with invalid dataset id (underscore) -> returns 400 and error", function () {
        const id = "bad_courses_id";
        const kind = "courses";
        const filePath = "./test/data/courses/courses.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect.fail(
                            "Response should have bad request status code",
                        );
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect(errRes.status).to.equal(400);
                        expect(errRes.response.body).to.have.property("error");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    it("PUT /dataset/:id/:kind with invalid dataset id (spaces) -> returns 400 and error", function () {
        const id = "bad courses id";
        const kind = "courses";
        const filePath = "./test/data/courses/courses.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect.fail(
                            "Response should have bad request status code",
                        );
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect(errRes.status).to.equal(400);
                        expect(errRes.response.body).to.have.property("error");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    it("PUT /dataset/:id/:kind with invalid dataset id (reserved) -> returns 400 and error", function () {
        const id = "dataset";
        const kind = "courses";
        const filePath = "./test/data/courses/courses.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect.fail(
                            "Response should have bad request status code",
                        );
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect(errRes.status).to.equal(400);
                        expect(errRes.response.body).to.have.property("error");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    it("PUT /dataset/:id/:kind with invalid dataset kind -> returns 400 and error", function () {
        const id = "courses";
        const kind = "invalidKIND";
        const filePath = "./test/data/courses/courses.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect.fail(
                            "Response should have bad request status code",
                        );
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect(errRes.status).to.equal(400);
                        expect(errRes.response.body).to.have.property("error");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    it("PUT /dataset/:id/:kind with no dataset body -> returns 400 and error", function () {
        const id = "courses";
        const kind = "courses";

        return chai
            .request(SERVER_URL)
            .put(`/dataset/${id}/${kind}`)
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                expect.fail("Response should have bad request status code");
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                expect(errRes.status).to.equal(400);
                expect(errRes.response.body).to.have.property("error");
            });
    });

    it("PUT /dataset/:id/:kind with empty courses dataset -> returns 400 and error", function () {
        const id = "courses";
        const kind = "courses";
        const filePath = "./test/data/courses/empty.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect.fail(
                            "Response should have bad request status code",
                        );
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect(errRes.status).to.equal(400);
                        expect(errRes.response.body).to.have.property("error");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    it("PUT /dataset/:id/:kind with empty rooms dataset -> returns 400 and error", function () {
        const id = "rooms";
        const kind = "rooms";
        const filePath = "./test/data/rooms/empty.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect.fail(
                            "Response should have bad request status code",
                        );
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect(errRes.status).to.equal(400);
                        expect(errRes.response.body).to.have.property("error");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    it("PUT /dataset/:id/:kind with invalid courses dataset format -> returns 400 and error", function () {
        const id = "courses";
        const kind = "courses";
        const filePath = "./test/data/courses/invalid_format.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect.fail(
                            "Response should have bad request status code",
                        );
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect(errRes.status).to.equal(400);
                        expect(errRes.response.body).to.have.property("error");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    it("PUT /dataset/:id/:kind with courses DS, kind = rooms -> returns 400 and error", function () {
        const id = "courses";
        const kind = "rooms";
        const filePath = "./test/data/courses/courses.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect.fail(
                            "Response should have bad request status code",
                        );
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect(errRes.status).to.equal(400);
                        expect(errRes.response.body).to.have.property("error");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    it("PUT /dataset/:id/:kind with rooms DS, kind = courses -> returns 400 and error", function () {
        const id = "rooms";
        const kind = "courses";
        const filePath = "./test/data/rooms/rooms.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect.fail(
                            "Response should have bad request status code",
                        );
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect(errRes.status).to.equal(400);
                        expect(errRes.response.body).to.have.property("error");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    it("PUT /dataset/:id/:kind with valid courses dataset, kind and id -> returns 204", function () {
        const id = "courses";
        const kind = "courses";
        const filePath = "./test/data/courses/courses.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect(res.status).to.equal(
                            204,
                            "Response status should be 204",
                        );
                        // 204 Response Code Treated as having no body by Restify, no data sent to client
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect.fail("The request should be successful");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    it("PUT /dataset/:id/:kind with another valid courses dataset, kind and unique id -> returns 204", function () {
        const id = "coursesTwoEntries";
        const kind = "courses";
        const filePath = "./test/data/courses/two_entries.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect(res.status).to.equal(
                            204,
                            "Response status should be 204",
                        );
                        // 204 Response Code Treated as having no body by Restify, no data sent to client
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect.fail("The request should be successful");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    it("PUT /dataset/:id/:kind with a valid courses dataset, kind but previously used id -> returns 400", function () {
        const id = "courses";
        const kind = "courses";
        const filePath = "./test/data/courses/courses_large.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect.fail(
                            "Response should have bad request status code",
                        );
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect(errRes.status).to.equal(400);
                        expect(errRes.response.body).to.have.property("error");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    it("PUT /dataset/:id/:kind with a valid rooms dataset, kind but previously used id -> returns 400", function () {
        const id = "courses";
        const kind = "rooms";
        const filePath = "./test/data/rooms/two_rooms.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect.fail(
                            "Response should have bad request status code",
                        );
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect(errRes.status).to.equal(400);
                        expect(errRes.response.body).to.have.property("error");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    it("PUT /dataset/:id/:kind with a valid rooms dataset, kind and unique id -> returns 204", function () {
        const id = "rooms";
        const kind = "rooms";
        const filePath = "./test/data/rooms/rooms.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect(res.status).to.equal(
                            204,
                            "Response status should be 204",
                        );
                        // 204 Response Code Treated as having no body by Restify, no data sent to client
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect.fail("The request should be successful");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });

    it("PUT /dataset/:id/:kind with another valid rooms dataset, kind and unique id -> returns 204", function () {
        const id = "roomsTwoEntries";
        const kind = "rooms";
        const filePath = "./test/data/rooms/two_rooms.zip";

        return TestUtil.readFileAsync(filePath)
            .then((fileBuffer) => {
                return chai
                    .request(SERVER_URL)
                    .put(`/dataset/${id}/${kind}`)
                    .send(fileBuffer)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then((res: Response) => {
                        Log.test(
                            `Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                        );
                        expect(res.status).to.equal(
                            204,
                            "Response status should be 204",
                        );
                        // 204 Response Code Treated as having no body by Restify, no data sent to client
                    })
                    .catch((errRes) => {
                        Log.test(
                            `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                        );
                        expect.fail("The request should be successful");
                    });
            })
            .catch((err) => {
                Log.error(`ERROR: ${err}`);
                expect.fail(JSON.stringify(err));
            });
    });
});
