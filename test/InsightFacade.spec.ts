import { expect } from "chai";

import {
    InsightResponse,
    InsightResponseSuccessBody,
    InsightResponseErrorBody,
    InsightDatasetKind,
    InsightDataset,
} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the JSON schema described in test/query.schema.json
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any; // make any to allow testing structurally invalid queries
    response: InsightResponse;
    filename: string; // This is injected when reading the file
}

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the Before All hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        empty: "./test/data/empty.zip",
        invalid_format: "./test/data/invalid_format.zip",
    };

    let insightFacade: InsightFacade;
    let datasets: { [id: string]: string };

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToLoad)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map(
                (buf, i) => {
                    return {
                        [Object.keys(datasetsToLoad)[i]]:
                            buf.toString("base64"),
                    };
                }
            );
            datasets = Object.assign({}, ...loadedDatasets);
            expect(Object.keys(datasets)).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail(
                "",
                "",
                `Failed to read one or more datasets. ${JSON.stringify(err)}`
            );
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("addDataset: Should add a valid dataset", async () => {
        const id: string = "courses";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses
            );
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("addDataset: Should throw an error when trying to add a dataset with the same id", async () => {
        const id: string = "courses";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses
            );
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("addDataset: Should throw an error when trying to add a non-existent dataset", async () => {
        const id: string = "non-existant-courses";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses
            );
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response).to.have.key("error");
        }
    });

    it("addDataset: Should throw an error when trying to add a dataset containing no CSV files", async () => {
        const id: string = "empty";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses
            );
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response).to.have.key("error");
        }
    });

    it("addDataset: Should throw an error when trying to add a dataset with only invalid format data", async () => {
        const id: string = "invalid_format";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses
            );
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response).to.have.key("error");
        }
    });

    it("addDataset: Should throw an error when trying to add a dataset with no valid course sections", async () => {
        const id: string = "no_sections";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses
            );
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response).to.have.key("error");
        }
    });

    it("removeDataset: Should remove the courses dataset successfully after it has been added", async () => {
        const id: string = "courses";
        const expectedCode = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("removeDataset: Should return an error when asked to remove non-existent dataset", async () => {
        const id: string = "courses";
        const expectedCode = 404;
        let response: InsightResponse;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response).to.have.key("error");
        }
    });

    it("addDataset: Should return an error when asked to add a dataset with incorrect kind given", async () => {
        const id: string = "courses";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Rooms
            );
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response).to.have.key("error");
        }
    });
});

// This test suite dynamically generates tests from the JSON files in test/queries.
// You should not need to modify it; instead, add additional files to the queries directory.
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        singleentry: "./test/data/single_entry.zip",
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Create a new instance of InsightFacade, read in the test queries from test/queries and
    // add the datasets specified in datasetsToQuery.
    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = await TestUtil.readTestQueries();
            expect(testQueries).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail(
                "",
                "",
                `Failed to read one or more test queries. ${JSON.stringify(
                    err
                )}`
            );
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Fail if there is a problem reading ANY dataset.
        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToQuery)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map(
                (buf, i) => {
                    return {
                        [Object.keys(datasetsToQuery)[i]]:
                            buf.toString("base64"),
                    };
                }
            );
            expect(loadedDatasets).to.have.length.greaterThan(0);

            const responsePromises: Array<Promise<InsightResponse>> = [];
            const datasets: { [id: string]: string } = Object.assign(
                {},
                ...loadedDatasets
            );
            for (const [id, content] of Object.entries(datasets)) {
                responsePromises.push(
                    insightFacade.addDataset(
                        id,
                        content,
                        InsightDatasetKind.Courses
                    )
                );
            }

            // This try/catch is a hack to let your dynamic tests execute enough the addDataset method fails.
            // In D1, you should remove this try/catch to ensure your datasets load successfully before trying
            // to run you queries.
            try {
                const responses: InsightResponse[] = await Promise.all(
                    responsePromises
                );
                responses.forEach((response) =>
                    expect(response.code).to.equal(204)
                );
            } catch (err) {
                Log.warn(
                    `Ignoring addDataset errors. For D1, you should allow errors to fail the Before All hook.`
                );
            }
        } catch (err) {
            expect.fail(
                "",
                "",
                `Failed to read one or more datasets. ${JSON.stringify(err)}`
            );
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    it("Should run test queries", () => {
        describe("Dynamic InsightFacade PerformQuery tests", () => {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, async () => {
                    let response: InsightResponse;

                    try {
                        response = await insightFacade.performQuery(test.query);
                    } catch (err) {
                        response = err;
                    } finally {
                        expect(response.code).to.equal(test.response.code);

                        if (test.response.code >= 400) {
                            expect(response.body).to.have.property("error");
                        } else {
                            expect(response.body).to.have.property("result");
                            const expectedResult = (
                                test.response.body as InsightResponseSuccessBody
                            ).result;
                            const actualResult = (
                                response.body as InsightResponseSuccessBody
                            ).result;
                            expect(actualResult).to.deep.equal(expectedResult);
                        }
                    }
                });
            }
        });
    });
});

describe("InsightFacade List Datasets", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the Before All hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        empty: "./test/data/empty.zip",
    };

    let insightFacade: InsightFacade;
    let datasets: { [id: string]: string };

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToLoad)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map(
                (buf, i) => {
                    return {
                        [Object.keys(datasetsToLoad)[i]]:
                            buf.toString("base64"),
                    };
                }
            );
            datasets = Object.assign({}, ...loadedDatasets);
            expect(Object.keys(datasets)).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail(
                "",
                "",
                `Failed to read one or more datasets. ${JSON.stringify(err)}`
            );
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("listDatasets: Should return an empty list of datasets before any datasets are added:", async () => {
        const expectedCode = 200;
        let response: InsightResponse;

        try {
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.key("result");

            if ("result" in response.body) {
                const body: InsightResponseSuccessBody = response.body;

                expect(body.result).to.be.instanceof(Array);
                expect(body.result).to.have.lengthOf(0);
            }
        }
    });

    it("listDatasets: Should list valid added datasets when datasets are added", async () => {
        const idValid: string = "courses";
        const idInvalid: string = "empty";
        const expectedCode = 200;
        let response: InsightResponse;

        try {
            await insightFacade.addDataset(
                idValid,
                datasets[idValid],
                InsightDatasetKind.Courses
            );

            await insightFacade.addDataset(
                idInvalid,
                datasets[idInvalid],
                InsightDatasetKind.Courses
            );

            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.key("result");

            if ("result" in response.body) {
                const body: InsightResponseSuccessBody = response.body;

                expect(body.result).to.be.instanceof(Array);
                expect(body.result).to.have.lengthOf(1);

                const dataset: InsightDataset = body.result[0];
                expect(dataset).to.have.all.keys(["id", "kind", "numRows"]);
                expect(dataset.id).to.equal(idValid);
            }
        }
    });

    it("listDatasets: Should return empty list after all valid datasets are removed", async () => {
        const idValid: string = "courses";
        const expectedCode = 200;
        let response: InsightResponse;

        try {
            await insightFacade.removeDataset(idValid);
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.key("result");

            if ("result" in response.body) {
                const body: InsightResponseSuccessBody = response.body;

                expect(body.result).to.be.instanceof(Array);
                expect(body.result).to.have.lengthOf(0);
            }
        }
    });
});
