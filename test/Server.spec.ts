import { promises as fs } from "fs";
import chai = require("chai");
import chaiHttp = require("chai-http");
import { expect } from "chai";

import Response = ChaiHttp.Response;

import {
    InsightDataset,
    InsightResponseSuccessBody,
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

        // Clear dataset cache prior to testing
        const deletionError = await TestUtil.deleteCacheAsync(CACHE_PATH);

        if (deletionError) {
            expect.fail(deletionError);
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

        // Clear dataset cache after testing
        const deletionError = await TestUtil.deleteCacheAsync(CACHE_PATH);

        if (deletionError) {
            expect.fail(deletionError);
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

    // INITIAL DATASETS AVAILABLE (GET) ROUTE TEST
    it("GET /datasets with no datasets added -> returns 200 and empty list of datasets", function () {
        const expectedBody: InsightResponseSuccessBody = { result: [] }; // Start tests with no datasets loaded

        return chai
            .request(SERVER_URL)
            .get("/datasets")
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                expect(res.status).to.equal(200);
                expect(res.type).to.equal("application/json");
                expect(res.body).to.deep.equal(expectedBody);
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                expect.fail("GET /datasets should have a successful response");
            });
    });

    // DATASET LOADING (PUT) ROUTE TESTS
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

    // DATASETS AVAILABLE (GET) ROUTE TEST AFTER LOADING 4 DATASETS
    it("GET /datasets after adding 4 datasets -> returns 200 and list of datasets", function () {
        const expectedBody: InsightResponseSuccessBody = {
            result: [
                { id: "courses", kind: "courses", numRows: 49044 },
                { id: "coursesTwoEntries", kind: "courses", numRows: 2 },
                { id: "rooms", kind: "rooms", numRows: 284 },
                { id: "roomsTwoEntries", kind: "rooms", numRows: 2 },
            ],
        };

        return chai
            .request(SERVER_URL)
            .get("/datasets")
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                expect(res.status).to.equal(200);
                expect(res.type).to.equal("application/json");
                expect(res.body).to.deep.equal(expectedBody);
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                expect.fail("GET /datasets should have a successful response");
            });
    });

    // QUERY DATASETS (POST) ROUTE TESTS
    it("POST /query with invalid query string -> returns 400 and error", function () {
        const kind = "courses";
        const id = "coursesTwoEntries";
        const dataset = `In ${kind} dataset ${id}, `;
        const filter = "WHERE *; ";
        const display =
            "SELECT Audit, Average, Department, Fail, ID, Instructor, Pass, Title, UUID and Year.";

        const queryString = dataset + filter + display;

        let response: Response | any;

        return chai
            .request(SERVER_URL)
            .post(`/query`)
            .send(queryString)
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                response = res;
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                response = errRes;
            })
            .then(() => {
                expect(response.status).to.equal(
                    400,
                    "Expect response status to be 400",
                );
                expect(response.response.body).to.have.property("error");
            });
    });

    it("POST /query with invalid query object -> returns 400 and error", function () {
        const queryObj = {
            FROM: "coursesTwoEntries",
            KIND: "courses",
            WHERE: {},
            OPTIONS: {
                SELECT: [
                    "coursesTwoEntries_audit",
                    "coursesTwoEntries_avg",
                    "coursesTwoEntries_dept",
                    "coursesTwoEntries_fail",
                    "coursesTwoEntries_id",
                    "coursesTwoEntries_instructor",
                    "coursesTwoEntries_pass",
                    "coursesTwoEntries_title",
                    "coursesTwoEntries_uuid",
                    "coursesTwoEntries_year",
                ],
            },
        };

        let response: Response | any;

        return chai
            .request(SERVER_URL)
            .post(`/query`)
            .send(queryObj)
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                response = res;
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                response = errRes;
            })
            .then(() => {
                expect(response.status).to.equal(
                    400,
                    "Expect response status to be 400",
                );
                expect(response.response.body).to.have.property("error");
            });
    });

    it("POST /query with valid query string for unloaded dataset -> returns 400 and error", function () {
        const kind = "courses";
        const id = "unloadedCoursesDataset";
        const dataset = `In ${kind} dataset ${id}, `;
        const filter = "find all entries; ";
        const display =
            "show Audit, Average, Department, Fail, ID, Instructor, Pass, Title, UUID and Year.";

        const queryString = dataset + filter + display;

        let response: Response | any;

        return chai
            .request(SERVER_URL)
            .post(`/query`)
            .send(queryString)
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                response = res;
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                response = errRes;
            })
            .then(() => {
                expect(response.status).to.equal(
                    400,
                    "Expect response status to be 400",
                );
                expect(response.response.body).to.have.property("error");
            });
    });

    it("POST /query with valid query object for unloaded dataset -> returns 400 and error", function () {
        const queryObj = {
            ID: "unloadedCoursesDataset",
            KIND: "courses",
            WHERE: {},
            OPTIONS: {
                COLUMNS: [
                    "coursesTwoEntries_audit",
                    "coursesTwoEntries_avg",
                    "coursesTwoEntries_dept",
                    "coursesTwoEntries_fail",
                    "coursesTwoEntries_id",
                    "coursesTwoEntries_instructor",
                    "coursesTwoEntries_pass",
                    "coursesTwoEntries_title",
                    "coursesTwoEntries_uuid",
                    "coursesTwoEntries_year",
                ],
            },
        };

        let response: Response | any;

        return chai
            .request(SERVER_URL)
            .post(`/query`)
            .send(queryObj)
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                response = res;
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                response = errRes;
            })
            .then(() => {
                expect(response.status).to.equal(
                    400,
                    "Expect response status to be 400",
                );
                expect(response.response.body).to.have.property("error");
            });
    });

    const coursesQueryExpectedResult = [
        {
            coursesTwoEntries_audit: 0,
            coursesTwoEntries_avg: 86.65,
            coursesTwoEntries_dept: "adhe",
            coursesTwoEntries_fail: 0,
            coursesTwoEntries_id: "327",
            coursesTwoEntries_instructor: "smulders, dave",
            coursesTwoEntries_pass: 23,
            coursesTwoEntries_title: "teach adult",
            coursesTwoEntries_uuid: "17255",
            coursesTwoEntries_year: 2010,
        },
        {
            coursesTwoEntries_audit: 10,
            coursesTwoEntries_avg: 80.13,
            coursesTwoEntries_dept: "phar",
            coursesTwoEntries_fail: 25,
            coursesTwoEntries_id: "454",
            coursesTwoEntries_instructor: "carr, roxane",
            coursesTwoEntries_pass: 221,
            coursesTwoEntries_title: "ped geri drg thp",
            coursesTwoEntries_uuid: "83080",
            coursesTwoEntries_year: 2014,
        },
    ];

    it("POST /query with valid courses query string on loaded dataset -> returns 200 and query result", function () {
        const kind = "courses";
        const id = "coursesTwoEntries";
        const dataset = `In ${kind} dataset ${id}, `;
        const filter = "find all entries; ";
        const display =
            "show Audit, Average, Department, Fail, ID, Instructor, Pass, Title, UUID and Year.";

        const queryString = dataset + filter + display;

        let response: Response | any;

        return chai
            .request(SERVER_URL)
            .post(`/query`)
            .send(queryString)
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                response = res;
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                response = errRes;
            })
            .then(() => {
                expect(response.status).to.equal(
                    200,
                    "Expect response status to be 200",
                );
                expect(response.body).to.have.property("result");
                expect(response.body.result).to.deep.equal(
                    coursesQueryExpectedResult,
                );
            });
    });

    it("POST /query with valid courses query object on loaded dataset -> returns 200 and query result", function () {
        const queryObj = {
            ID: "coursesTwoEntries",
            KIND: "courses",
            WHERE: {},
            OPTIONS: {
                COLUMNS: [
                    "coursesTwoEntries_audit",
                    "coursesTwoEntries_avg",
                    "coursesTwoEntries_dept",
                    "coursesTwoEntries_fail",
                    "coursesTwoEntries_id",
                    "coursesTwoEntries_instructor",
                    "coursesTwoEntries_pass",
                    "coursesTwoEntries_title",
                    "coursesTwoEntries_uuid",
                    "coursesTwoEntries_year",
                ],
            },
        };

        let response: Response | any;

        return chai
            .request(SERVER_URL)
            .post(`/query`)
            .send(queryObj)
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                response = res;
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                response = errRes;
            })
            .then(() => {
                expect(response.status).to.equal(
                    200,
                    "Expect response status to be 200",
                );
                expect(response.body).to.have.property("result");
                expect(response.body.result).to.deep.equal(
                    coursesQueryExpectedResult,
                );
            });
    });

    const roomsQueryExpectedResult = [
        {
            roomsTwoEntries_fullname: "Allard Hall (LAW)",
            roomsTwoEntries_shortname: "ALRD",
            roomsTwoEntries_number: "105",
            roomsTwoEntries_name: "ALRD_105",
            roomsTwoEntries_address: "1822 East Mall",
            roomsTwoEntries_lat: 49.2699,
            roomsTwoEntries_lon: -123.25318,
            roomsTwoEntries_seats: 94,
            roomsTwoEntries_type: "Case Style",
            roomsTwoEntries_furniture: "Classroom-Fixed Tables/Movable Chairs",
            roomsTwoEntries_href:
                "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ALRD-105",
        },
        {
            roomsTwoEntries_fullname: "Aquatic Ecosystems Research Laboratory",
            roomsTwoEntries_shortname: "AERL",
            roomsTwoEntries_number: "120",
            roomsTwoEntries_name: "AERL_120",
            roomsTwoEntries_address: "2202 Main Mall",
            roomsTwoEntries_lat: 49.26372,
            roomsTwoEntries_lon: -123.25099,
            roomsTwoEntries_seats: 144,
            roomsTwoEntries_type: "Tiered Large Group",
            roomsTwoEntries_furniture: "Classroom-Fixed Tablets",
            roomsTwoEntries_href:
                "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/AERL-120",
        },
    ];

    it("POST /query with valid rooms query string on loaded dataset -> returns 200 and query result", function () {
        const kind = "rooms";
        const id = "roomsTwoEntries";
        const dataset = `In ${kind} dataset ${id}, `;
        const filter = "find all entries; ";
        const display =
            "show Full Name, Short Name, Number, Name, Address, Type, Furniture, Link, Latitude, Longitude and Seats.";

        const queryString = dataset + filter + display;

        let response: Response | any;

        return chai
            .request(SERVER_URL)
            .post(`/query`)
            .send(queryString)
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                response = res;
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                response = errRes;
            })
            .then(() => {
                expect(response.status).to.equal(
                    200,
                    "Expect response status to be 200",
                );
                expect(response.body).to.have.property("result");
                expect(response.body.result).to.deep.equal(
                    roomsQueryExpectedResult,
                );
            });
    });

    it("POST /query with valid rooms query object on loaded dataset -> returns 200 and query result", function () {
        const queryObj = {
            ID: "roomsTwoEntries",
            KIND: "rooms",
            WHERE: {},
            OPTIONS: {
                COLUMNS: [
                    "roomsTwoEntries_fullname",
                    "roomsTwoEntries_shortname",
                    "roomsTwoEntries_number",
                    "roomsTwoEntries_name",
                    "roomsTwoEntries_address",
                    "roomsTwoEntries_lat",
                    "roomsTwoEntries_lon",
                    "roomsTwoEntries_seats",
                    "roomsTwoEntries_type",
                    "roomsTwoEntries_furniture",
                    "roomsTwoEntries_href",
                ],
            },
        };

        let response: Response | any;

        return chai
            .request(SERVER_URL)
            .post(`/query`)
            .send(queryObj)
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                response = res;
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                response = errRes;
            })
            .then(() => {
                expect(response.status).to.equal(
                    200,
                    "Expect response status to be 200",
                );
                expect(response.body).to.have.property("result");
                expect(response.body.result).to.deep.equal(
                    roomsQueryExpectedResult,
                );
            });
    });

    // DELETE DATASET(S) (DELETE) ROUTE TESTS
    it("DELETE /dataset/:id with non-existent id -> returns 404", function () {
        const id = "nonExistentID";
        let response: Response | any;

        return chai
            .request(SERVER_URL)
            .del(`/dataset/${id}`)
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                response = res;
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                response = errRes;
            })
            .then(() => {
                expect(response.status).to.equal(
                    404,
                    "Expect response status to be 404",
                );
                expect(response.response.body).to.have.property("error");
            });
    });

    it("DELETE /dataset/:id with loaded courses dataset id -> deletes dataset and returns 204", function () {
        const id = "coursesTwoEntries";
        let response: Response | any;

        return chai
            .request(SERVER_URL)
            .del(`/dataset/${id}`)
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                response = res;
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                response = errRes;
            })
            .then(() => {
                expect(response.status).to.equal(
                    204,
                    "Expect response status to be 204",
                );
                // 204 status response does not receive body
            });
    });

    it("DELETE /dataset/:id with id that has been deleted -> returns 404", function () {
        const id = "coursesTwoEntries";
        let response: Response | any;

        return chai
            .request(SERVER_URL)
            .del(`/dataset/${id}`)
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                response = res;
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                response = errRes;
            })
            .then(() => {
                expect(response.status).to.equal(
                    404,
                    "Expect response status to be 404",
                );
                expect(response.response.body).to.have.property("error");
            });
    });

    it("DELETE /dataset/:id with loaded rooms dataset id -> deletes dataset and returns 204", function () {
        const id = "roomsTwoEntries";
        let response: Response | any;

        return chai
            .request(SERVER_URL)
            .del(`/dataset/${id}`)
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );
                response = res;
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                response = errRes;
            })
            .then(() => {
                expect(response.status).to.equal(
                    204,
                    "Expect response status to be 204",
                );
                // 204 status response does not receive body
            });
    });

    // DATASETS AVAILABLE (GET) ROUTE TEST AFTER DELETING 2 DATASETS (2 Remaining)
    it("GET /datasets after adding 4 datasets -> returns 200 and list of datasets", function () {
        const expectedBody: InsightResponseSuccessBody = {
            result: [
                { id: "courses", kind: "courses", numRows: 49044 },
                { id: "rooms", kind: "rooms", numRows: 284 },
            ],
        };

        let response: Response | any;

        return chai
            .request(SERVER_URL)
            .get("/datasets")
            .then((res: Response) => {
                Log.test(
                    `Successful Response Received: [Status: ${res.status}, Type: ${res.type}]`,
                );

                response = res;
            })
            .catch((errRes) => {
                Log.test(
                    `Bad Response Received: [Status: ${errRes.status}, Type: ${errRes.response.type}]`,
                );
                response = errRes;
            })
            .then(() => {
                expect(response.status).to.equal(
                    200,
                    "Response should have success (200) status code",
                );
                expect(response.type).to.equal("application/json");
                expect(response.body).to.deep.equal(expectedBody);
            });
    });
});
