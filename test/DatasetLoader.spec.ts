import { expect } from "chai";

import DatasetLoader from "../src/controller/DatasetLoader";
import {
    InsightResponse,
    InsightResponseSuccessBody,
    InsightResponseErrorBody,
    InsightDatasetKind,
} from "../src/controller/IInsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

describe("DatasetLoader loadDataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the Before All hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        singleentry: "./test/data/single_entry.zip",
        empty: "./test/data/empty.zip",
        invalid_format: "./test/data/invalid_format.zip",
    };

    let datasetLoader: DatasetLoader;
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
                },
            );
            datasets = Object.assign({}, ...loadedDatasets);
            expect(Object.keys(datasets)).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail(
                "",
                "",
                `Failed to read one or more datasets. ${JSON.stringify(err)}`,
            );
        }

        try {
            datasetLoader = new DatasetLoader();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(datasetLoader).to.be.instanceOf(DatasetLoader);
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

    it("loadDataset: Should return a Promise when called", () => {
        expect(datasetLoader.loadDataset(null, null, null)).to.be.an("promise");
    });

    it("loadDataset: Should return an error when called with an invalid dataset kind", async () => {
        const expectedCode: number = 400;
        const errorStr: string = `DatasetLoader.loadDataset ERROR: Invalid Dataset Kind Given: ${null}`;
        let response: InsightResponse;

        try {
            response = await datasetLoader.loadDataset(null, null, null);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.own.property("error");
            const actualResult = response.body as InsightResponseErrorBody;
            expect(actualResult.error).to.equal(errorStr);
        }
    });

    it("loadDataset: For D1, 'Rooms' dataset kind is invalid, should return an error", async () => {
        const expectedCode = 400;
        const errorStr = `DatasetLoader.loadDataset ERROR: Invalid Dataset Kind Given: ${InsightDatasetKind.Rooms}`;
        let response: InsightResponse;

        try {
            response = await datasetLoader.loadDataset(
                null,
                null,
                InsightDatasetKind.Rooms,
            );
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.own.property("error");
            const actualResult = response.body as InsightResponseErrorBody;
            expect(actualResult.error).to.equal(errorStr);
        }
    });

    it("loadDataset: Should return an error when no dataset id is given", async () => {
        const id: string = null;
        const expectedCode = 400;
        const errorStr = `DatasetLoader.loadDataset ERROR: Invalid Dataset Id Given: ${id}`;
        let response: InsightResponse;

        try {
            response = await datasetLoader.loadDataset(
                id,
                null,
                InsightDatasetKind.Courses,
            );
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.own.property("error");
            const actualResult = response.body as InsightResponseErrorBody;
            expect(actualResult.error).to.equal(errorStr);
        }
    });

    it("loadDataset: Should return an error when no dataset content is given", async () => {
        const id: string = "singleentry";
        const expectedCode = 400;
        const errorStr = `DatasetLoader.loadDataset ERROR: No dataset content given: ${""}`;
        let response: InsightResponse;

        try {
            response = await datasetLoader.loadDataset(
                id,
                "",
                InsightDatasetKind.Courses,
            );
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.own.property("error");
            const actualResult = response.body as InsightResponseErrorBody;
            expect(actualResult.error).to.equal(errorStr);
        }
    });

    it("loadDataset: Should return an error when dataset contains no courses folder (empty.zip)", async () => {
        const id: string = "empty";
        const expectedCode: number = 400;
        let response: InsightResponse;
        const errorStr =
            "DatasetLoader.loadDataset ERROR: Given dataset contained no csv files in 'courses' folder";

        try {
            response = await datasetLoader.loadDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses,
            );
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.own.property("error");
            const actualResult = response.body as InsightResponseErrorBody;
            expect(actualResult.error).to.equal(errorStr);
        }
    });

    it("loadDataset: Should successfully load a tiny valid COURSES dataset (single_entry.zip)", async () => {
        const id: string = "singleentry";
        const kind = InsightDatasetKind.Courses;
        const expectedCode: number = 204;
        const expectedResult = [id, kind, 1];
        let response: InsightResponse;

        try {
            response = await datasetLoader.loadDataset(id, datasets[id], kind);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.own.property("result");
            const actualResult = (response.body as InsightResponseSuccessBody)
                .result;
            expect(actualResult).to.deep.equal(expectedResult);
        }
    });

    // it("loadDataset: Should return an error when asked to load an id that has already been loaded", async () => {});
});
