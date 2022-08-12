import { expect, assert } from "chai";
import { promises as fs } from "fs";
import * as path from "path";

import {
    InsightResponse,
    InsightResponseSuccessBody,
    InsightResponseErrorBody,
    InsightDatasetKind,
    InsightDataset,
    InsightCourseDataObject,
} from "../src/controller/IInsightFacade";

import DatasetLoader from "../src/controller/DatasetLoader";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

describe("DatasetLoader Tests", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the Before All hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses/courses.zip",
        coursesLarge: "./test/data/courses/courses_large.zip",
        coursesSingleEntry: "./test/data/courses/single_entry.zip",
        coursesTwoEntries: "./test/data/courses/two_entries.zip",
        coursesEmpty: "./test/data/courses/empty.zip",
        coursesInvalidFormat: "./test/data/courses/invalid_format.zip",
        coursesSectionOverall: "./test/data/courses/section_overall.zip",
        rooms: "./test/data/rooms/rooms.zip",
        roomsSingleRoom: "./test/data/rooms/single_room.zip",
        roomsEmpty: "./test/data/rooms/empty.zip",
    };

    let datasetLoader: DatasetLoader;
    let datasets: { [id: string]: string };

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, filePath] of Object.entries(datasetsToLoad)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(filePath));
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

        // Delete dataset cache directory before running tests
        try {
            const cachePath = datasetLoader.getCachePath();
            await fs.access(cachePath);
            // Cache path must exist if no error is thrown, remove it:
            await fs.rmdir(cachePath, { recursive: true });
        } catch (err) {
            // If we get here then the cache directory does not exist
            // Continue with testing
            Log.error(`Error when trying to clean cache before tests: ${err}`);
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

    it("getLoadedDatasets: Returns a Promise when called", () => {
        expect(datasetLoader.getLoadedDatasets()).to.be.an("promise");
    });

    it("getLoadedDatasets: Returns no datasets when none have been added", async () => {
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

    it("loadDataset: Returns a Promise when called", () => {
        expect(datasetLoader.loadDataset(null, null, null)).to.be.an("promise");
    });

    it("loadDataset: Returns an error when called with an invalid dataset kind", async () => {
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

    it("loadDataset: Returns an error when no dataset id is given", async () => {
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

    it("loadDataset: Returns an error when no dataset content is given", async () => {
        const id: string = "coursesSingleEntry";
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

    it("loadDataset (COURSES): Returns an error when dataset contains no courses folder (empty.zip)", async () => {
        const id: string = "coursesEmpty";
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

    it("loadDataset (COURSES): Returns an error when dataset has no valid sections (invalid_format.zip)", async () => {
        const id: string = "coursesInvalidFormat";
        const expectedCode: number = 400;
        let response: InsightResponse;
        const errorStr =
            "DatasetLoader.loadDataset ERROR: Given dataset contains no valid course sections";

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

    it("loadDataset (COURSES): Loads a tiny valid COURSES dataset (single_entry.zip)", async () => {
        const id: string = "coursesSingleEntry";
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

            // Check the dataset has been cached onto disk
            const cachePath = datasetLoader.getCachePath();
            try {
                await fs.access(path.join(cachePath, `${id}.json`));
            } catch (err) {
                assert.fail("Expected cached dataset not found on disk");
            }
        }
    });

    it('loadDataset (COURSES): Loads valid COURSES dataset with Section="overall" (section_overall.zip)', async () => {
        const id: string = "coursesSectionOverall";
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

            // Check the dataset has been cached onto disk
            const cachePath = datasetLoader.getCachePath();
            try {
                await fs.access(path.join(cachePath, `${id}.json`));
            } catch (err) {
                assert.fail("Expected cached dataset not found on disk");
            }
        }
    });

    it("loadDataset (COURSES): Loads a small valid COURSES dataset (two_entries.zip)", async () => {
        const id: string = "coursesTwoEntries";
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

        // Check the dataset has been cached onto disk
        const cachePath = datasetLoader.getCachePath();
        try {
            await fs.access(path.join(cachePath, `${id}.json`));
        } catch (err) {
            assert.fail("Expected cached dataset not found on disk");
        }
    });

    it("loadDataset (COURSES): Loads the standard valid COURSES dataset (courses.zip)", async () => {
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

        // Check the dataset has been cached onto disk
        const cachePath = datasetLoader.getCachePath();
        try {
            await fs.access(path.join(cachePath, `${id}.json`));
        } catch (err) {
            assert.fail("Expected cached dataset not found on disk");
        }
    });

    it("loadDataset (COURSES): Loads expanded COURSES dataset (courses_large.zip)", async () => {
        const id: string = "coursesLarge";
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

        // Check the dataset has been cached onto disk
        const cachePath = datasetLoader.getCachePath();
        try {
            await fs.access(path.join(cachePath, `${id}.json`));
        } catch (err) {
            assert.fail("Expected cached dataset not found on disk");
        }
    });

    it("loadDataset: Returns an error when asked to load an id that has already been loaded", async () => {
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

        // Check the original dataset has been cached onto disk
        const cachePath = datasetLoader.getCachePath();
        try {
            await fs.access(path.join(cachePath, `${id}.json`));
        } catch (err) {
            assert.fail("Expected cached dataset not found on disk");
        }
    });

    it("getLoadedDatasets: Returns InsightDatasets when datasets have been added", async () => {
        const expectedCode: number = 200;
        const idkCourses = InsightDatasetKind.Courses;
        const expectedResult: InsightDataset[] = [
            { id: "coursesSingleEntry", kind: idkCourses, numRows: 1 },
            { id: "coursesSectionOverall", kind: idkCourses, numRows: 1 },
            { id: "coursesTwoEntries", kind: idkCourses, numRows: 2 },
            { id: "courses", kind: idkCourses, numRows: 49044 },
            { id: "coursesLarge", kind: idkCourses, numRows: 64612 },
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
            expect(actualResult).to.have.lengthOf(expectedResult.length);
            expect(actualResult).to.deep.equal(expectedResult);
        }
    });

    it("deleteDataset: Returns an error when trying to delete unloaded datasets", async () => {
        const id = "unloadeddataset";
        const expectedCode: number = 404;
        const expectedErrorStr = `DatasetLoader.deleteDataset ERROR: Dataset with id ${id} not found`;
        let response: InsightResponse;

        try {
            response = await datasetLoader.deleteDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.own.property("error");
            const actualError = (response.body as InsightResponseErrorBody)
                .error;
            expect(actualError).to.equal(expectedErrorStr);
        }
    });

    it("deleteDataset: Should successfully delete a loaded dataset (courses.zip)", async () => {
        const id = "courses";
        const expectedCode: number = 204;
        const expectedResultStr = `Dataset with id ${id} was successfully deleted`;
        let response: InsightResponse;

        try {
            response = await datasetLoader.deleteDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.own.property("result");
            const actualResult = (response.body as InsightResponseSuccessBody)
                .result;
            expect(actualResult).to.deep.equal(expectedResultStr);
        }

        // Check the dataset has been deleted
        const cachePath = datasetLoader.getCachePath();
        try {
            await fs.access(path.join(cachePath, `${id}.json`));
            assert.fail(
                "Cached dataset found on disk when it should be deleted",
            );
        } catch (err) {
            // We expect to be here if the cache file has successfully been deleted
        }
    });

    it("getLoadedDatasets: Returns updated InsightDatasets when datasets have been deleted", async () => {
        const expectedCode: number = 200;
        const idkCourses = InsightDatasetKind.Courses;
        const expectedResult: InsightDataset[] = [
            { id: "coursesSingleEntry", kind: idkCourses, numRows: 1 },
            { id: "coursesSectionOverall", kind: idkCourses, numRows: 1 },
            { id: "coursesTwoEntries", kind: idkCourses, numRows: 2 },
            { id: "coursesLarge", kind: idkCourses, numRows: 64612 },
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
            expect(actualResult).to.have.lengthOf(expectedResult.length);
            expect(actualResult).to.deep.equal(expectedResult);
        }
    });

    it("loadDataset: Should successfully re-load a dataset after deletion (courses.zip)", async () => {
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

        // Check the dataset has been cached onto disk
        const cachePath = datasetLoader.getCachePath();
        try {
            await fs.access(path.join(cachePath, `${id}.json`));
        } catch (err) {
            assert.fail("Expected cached dataset not found on disk");
        }
    });

    it("loadDataset (ROOMS): Returns an error on an empty dataset (empty.zip)", async () => {
        const id: string = "roomsEmpty";
        const expectedCode: number = 400;
        let response: InsightResponse;
        const errorStr = `DatasetLoader.loadDataset ERROR: Rooms dataset ${id} contains no index.xml file`;

        try {
            response = await datasetLoader.loadDataset(
                id,
                datasets[id],
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

    it("loadDataset (ROOMS): Loads a tiny rooms dataset (single_room.zip)", async () => {
        const id: string = "roomsSingleRoom";
        const kind = InsightDatasetKind.Rooms;
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

        // Check the dataset has been cached onto disk
        const cachePath = datasetLoader.getCachePath();
        try {
            await fs.access(path.join(cachePath, `${id}.json`));
        } catch (err) {
            assert.fail("Expected cached dataset not found on disk");
        }
    });

    it("loadDataset (ROOMS): Loads the standard ROOMS dataset (rooms.zip)", async () => {
        const id: string = "rooms";
        const kind = InsightDatasetKind.Rooms;
        const expectedCode: number = 204;
        const expectedResult = [id, kind, 284];
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

        // Check the dataset has been cached onto disk
        const cachePath = datasetLoader.getCachePath();
        try {
            await fs.access(path.join(cachePath, `${id}.json`));
        } catch (err) {
            assert.fail("Expected cached dataset not found on disk");
        }
    });

    it("getDataset: Throws an error when asked to get an unloaded dataset", () => {
        const id: string = "unloadedDataset";
        const kind = InsightDatasetKind.Courses;
        const expectedErrorStr = `DatasetLoader.getDataset ERROR: Dataset with ID ${id} not found`;

        let response: InsightCourseDataObject[];
        let errorMessage: string;
        try {
            response = datasetLoader.getDataset(id, kind);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErrorStr);
            expect(response).to.equal(undefined);
        }
    });

    it("getDataset: Throws an error when asked to get a dataset with incorrect kind (1)", () => {
        const id: string = "courses";
        const kind = InsightDatasetKind.Rooms;
        const expectedErrorStr = `DatasetLoader.getDataset ERROR: Dataset ${id} queried with incorrect KIND ${kind}`;

        let response: InsightCourseDataObject[];
        let errorMessage: string;
        try {
            response = datasetLoader.getDataset(id, kind);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErrorStr);
            expect(response).to.equal(undefined);
        }
    });

    it("getDataset: Throws an error when asked to get a dataset with incorrect kind (2)", () => {
        const id: string = "rooms";
        const kind = InsightDatasetKind.Courses;
        const expectedErrorStr = `DatasetLoader.getDataset ERROR: Dataset ${id} queried with incorrect KIND ${kind}`;

        let response: InsightCourseDataObject[];
        let errorMessage: string;
        try {
            response = datasetLoader.getDataset(id, kind);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErrorStr);
            expect(response).to.equal(undefined);
        }
    });

    it("getDataset (COURSES): Returns a loaded tiny courses dataset (single_entry.zip)", () => {
        const id: string = "coursesSingleEntry";
        const kind = InsightDatasetKind.Courses;
        const expectedResponse: InsightCourseDataObject[] = [
            {
                coursesSingleEntry_audit: 0,
                coursesSingleEntry_avg: 86.65,
                coursesSingleEntry_dept: "adhe",
                coursesSingleEntry_fail: 0,
                coursesSingleEntry_id: "327",
                coursesSingleEntry_instructor: "smulders, dave",
                coursesSingleEntry_pass: 23,
                coursesSingleEntry_title: "teach adult",
                coursesSingleEntry_uuid: "17255",
                coursesSingleEntry_year: 2010,
            },
        ];

        let response: InsightCourseDataObject[];

        try {
            response = datasetLoader.getDataset(id, kind);
        } catch (err) {
            assert.fail(`Unexpected Error thrown: ${err.message}`);
        } finally {
            expect(response).to.deep.equal(expectedResponse);
        }
    });

    it('getDataset (COURSES): Returns a loaded courses dataset with Section="overall" (section_overall.zip)', () => {
        const id: string = "coursesSectionOverall";
        const kind = InsightDatasetKind.Courses;
        const expectedResponse: InsightCourseDataObject[] = [
            {
                coursesSectionOverall_audit: 0,
                coursesSectionOverall_avg: 86.65,
                coursesSectionOverall_dept: "adhe",
                coursesSectionOverall_fail: 0,
                coursesSectionOverall_id: "327",
                coursesSectionOverall_instructor: "smulders, dave",
                coursesSectionOverall_pass: 23,
                coursesSectionOverall_title: "teach adult",
                coursesSectionOverall_uuid: "17255",
                coursesSectionOverall_year: 1900,
            },
        ];

        let response: InsightCourseDataObject[];

        try {
            response = datasetLoader.getDataset(id, kind);
        } catch (err) {
            assert.fail(`Unexpected Error thrown: ${err.message}`);
        } finally {
            expect(response).to.deep.equal(expectedResponse);
        }
    });

    it("getDataset (ROOMS): Returns a loaded tiny rooms dataset with (single_room.zip)", () => {
        const id: string = "roomsSingleRoom";
        const kind = InsightDatasetKind.Rooms;
        const expectedResponse: InsightCourseDataObject[] = [
            {
                roomsSingleRoom_fullname:
                    "Aquatic Ecosystems Research Laboratory",
                roomsSingleRoom_shortname: "AERL",
                roomsSingleRoom_number: "120",
                roomsSingleRoom_name: "AERL_120",
                roomsSingleRoom_address: "2202 Main Mall",
                roomsSingleRoom_lat: 49.26372,
                roomsSingleRoom_lon: -123.25099,
                roomsSingleRoom_seats: 144,
                roomsSingleRoom_type: "Tiered Large Group",
                roomsSingleRoom_furniture: "Classroom-Fixed Tablets",
                roomsSingleRoom_href:
                    "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/AERL-120",
            },
        ];

        let response: InsightCourseDataObject[];

        try {
            response = datasetLoader.getDataset(id, kind);
        } catch (err) {
            assert.fail(`Unexpected Error thrown: ${err.message}`);
        } finally {
            expect(response).to.deep.equal(expectedResponse);
        }
    });
});
