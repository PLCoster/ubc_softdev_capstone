import { expect } from "chai";

import DatasetLoader from "../src/controller/DatasetLoader";
import {
    InsightResponse,
    InsightResponseSuccessBody,
    InsightResponseErrorBody,
    InsightDatasetKind,
    InsightDataset,
} from "../src/controller/IInsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

describe("DatasetLoader Tests", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the Before All hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        courseslarge: "./test/data/courses_large.zip",
        singleentry: "./test/data/single_entry.zip",
        twoentries: "./test/data/two_entries.zip",
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

    it("getLoadedDatasets: Should return a Promise when called", () => {
        expect(datasetLoader.getLoadedDatasets()).to.be.an("promise");
    });

    it("getLoadedDatasets: Should return no datasets when none have been added", async () => {
        const expectedCode: number = 200;
        let response: InsightResponse;

        try {
            response = await datasetLoader.getLoadedDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.own.property("result");
            const actualResult = (response.body as InsightResponseSuccessBody)
                .result;
            expect(actualResult).to.be.instanceof(Array);
            expect(actualResult).to.have.lengthOf(0);
        }
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

    it("loadDataset: Should successfully load a small valid COURSES dataset (two_entries.zip)", async () => {
        const id: string = "twoentries";
        const kind = InsightDatasetKind.Courses;
        const expectedCode: number = 204;
        const expectedResult = [id, kind, 2];
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

    it("loadDataset: Should successfully load the standard valid COURSES dataset (courses.zip)", async () => {
        const id: string = "courses";
        const kind = InsightDatasetKind.Courses;
        const expectedCode: number = 204;
        const expectedResult = [id, kind, 49044];
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

    it("loadDataset: Should successfully load the expanded valid COURSES dataset (courses_large.zip)", async () => {
        const id: string = "courseslarge";
        const kind = InsightDatasetKind.Courses;
        const expectedCode: number = 204;
        const expectedResult = [id, kind, 64612];
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

    it("loadDataset: Should return an error when asked to load an id that has already been loaded", async () => {
        const id: string = "courses";
        const expectedCode: number = 400;
        let response: InsightResponse;
        const errorStr = `DatasetLoader.loadDataset ERROR: Dataset with ID '${id}' has already been loaded`;

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

    it("getLoadedDatasets: Should return InsightDatasets when datasets have been added", async () => {
        const expectedCode: number = 200;
        const idkCourses = InsightDatasetKind.Courses;
        const expectedResult: InsightDataset[] = [
            { id: "singleentry", kind: idkCourses, numRows: 1 },
            { id: "twoentries", kind: idkCourses, numRows: 2 },
            { id: "courses", kind: idkCourses, numRows: 49044 },
            { id: "courseslarge", kind: idkCourses, numRows: 64612 },
        ];
        let response: InsightResponse;

        try {
            response = await datasetLoader.getLoadedDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.own.property("result");
            const actualResult = (response.body as InsightResponseSuccessBody)
                .result;
            expect(actualResult).to.be.instanceof(Array);
            // singleentry, twoentries, courses, courseslarge have been added
            expect(actualResult).to.have.lengthOf(4);
            expect(actualResult).to.deep.equal(expectedResult);
        }
    });
});
