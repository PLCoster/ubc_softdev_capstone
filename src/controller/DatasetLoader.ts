import * as JSZip from "jszip";
import { promises as fs } from "fs";
import * as path from "path";

import {
    InsightResponse,
    InsightDataset,
    InsightDatasetKind,
    InsightCourseDataObject,
} from "./IInsightFacade";

import Log from "../Util";

const identity = (arg: string): string => arg;

const coursesColNumToQueryKeyTranslator: Array<
    [number, string, (arg1: string, ...args: any[]) => string | number]
> = [
    [0, "title", identity],
    [1, "uuid", identity],
    [2, "instructor", identity],
    [3, "audit", parseFloat],
    [5, "id", identity],
    [6, "pass", parseFloat],
    [7, "fail", parseFloat],
    [8, "avg", parseFloat],
    [9, "dept", identity],
];

export default class DatasetLoader {
    private loadedInsightDatasets: { [key: string]: InsightDataset };
    private datasets: { [key: string]: InsightCourseDataObject[] };
    private cachePath: string;

    constructor() {
        Log.trace("DatasetLoader::init()");
        this.loadedInsightDatasets = {};
        this.datasets = {};
        this.cachePath = path.join(__dirname, "../../.cache/");
    }

    public loadDataset(
        id: string,
        content: string,
        kind: InsightDatasetKind,
    ): Promise<InsightResponse> {
        return new Promise(async (resolve, reject) => {
            try {
                // Validate the dataset kind, id and content
                this.validateDatasetKind(kind);
                this.validateDatasetId(id);
                this.validateDatasetContent(content);
                if (kind === InsightDatasetKind.Courses) {
                    const processedCoursesData: InsightCourseDataObject[] =
                        await this.loadCoursesDataset(id, content);

                    // Add the dataset summary to loaded Insight datasets:
                    this.loadedInsightDatasets[id] = {
                        id,
                        kind,
                        numRows: processedCoursesData.length,
                    };

                    // Store the dataset itself for querying
                    this.datasets[id] = processedCoursesData;

                    Log.trace(
                        `Course InsightDataset Loaded: ${JSON.stringify(
                            this.loadedInsightDatasets[id],
                        )}`,
                    );

                    // Cache dataset to disk
                    try {
                        // Check if cacheing directory exists:
                        await fs.access(this.cachePath);
                    } catch (err) {
                        // Error is thrown if cache directory does not exist
                        await fs.mkdir(this.cachePath);
                    } finally {
                        await fs.writeFile(
                            path.join(this.cachePath, `${id}.json`),
                            JSON.stringify(processedCoursesData),
                        );
                    }

                    // Return success response including dataset info
                    return resolve({
                        code: 204,
                        body: {
                            result: [id, kind, processedCoursesData.length],
                        },
                    });
                }
            } catch (err) {
                return reject({
                    code: 400,
                    body: {
                        error: err.message,
                    },
                });
            }

            reject({ code: -1, body: null });
        });
    }

    // Deletes a given dataset if it is loaded, otherwise returns an error
    public deleteDataset(id: string): Promise<InsightResponse> {
        return new Promise(async (resolve, reject) => {
            if (this.loadedInsightDatasets.hasOwnProperty(id)) {
                delete this.loadedInsightDatasets[id];
                delete this.datasets[id];

                // Cache dataset to disk
                try {
                    // Check if cacheing directory exists:
                    await fs.access(this.cachePath);
                    // Try to delete the file
                    await fs.unlink(path.join(this.cachePath, `${id}.json`));
                } catch (err) {
                    return reject(
                        `DatasetLoader.deleteDataset ERROR: Cached Dataset with id ${id} not found in the cache`,
                    );
                }

                // Deletion successful
                return resolve({
                    code: 204,
                    body: {
                        result: `Dataset with id ${id} was successfully deleted`,
                    },
                });
            } else {
                return reject({
                    code: 404,
                    body: {
                        error: `DatasetLoader.deleteDataset ERROR: Dataset with id ${id} not found`,
                    },
                });
            }
        });
    }

    // Returns requested dataset, if it is already loaded, otherwise throws an error
    public getDataset(
        id: string,
        kind: InsightDatasetKind,
    ): InsightCourseDataObject[] {
        if (!this.datasets.hasOwnProperty(id)) {
            throw new Error(
                `DatasetLoader.getDataset ERROR: Dataset with ID ${id} not found`,
            );
        }

        // Ensure loaded dataset kind matches kind specified in query
        if (this.loadedInsightDatasets[id].kind !== kind) {
            throw new Error(
                `DatasetLoader.getDataset ERROR: Dataset with ID ${id} queried with incorrect KIND ${kind}`,
            );
        }

        // Return a COPY of the dataset to avoid possibility of mutation:
        return this.datasets[id].map(
            (courseSection: InsightCourseDataObject) => ({ ...courseSection }),
        );
    }

    // Returns InsightDataset(s) for all currently loaded datasets
    public getLoadedDatasets(): Promise<InsightResponse> {
        return Promise.resolve({
            code: 200,
            body: {
                result: Object.values(this.loadedInsightDatasets),
            },
        });
    }

    // Returns the path to the cached datasets directory
    public getCachePath(): string {
        return this.cachePath;
    }

    // Check that dataset kind is valid (D1 - Rooms dataset kind is not valid)
    private validateDatasetKind(kind: InsightDatasetKind) {
        if (
            !Object.values(InsightDatasetKind).includes(kind) ||
            kind === InsightDatasetKind.Rooms
        ) {
            throw new Error(
                `DatasetLoader.loadDataset ERROR: Invalid Dataset Kind Given: ${kind}`,
            );
        }
    }

    // Check that dataset id is valid and not already loaded
    private validateDatasetId(id: string) {
        if (!id) {
            throw new Error(
                `DatasetLoader.loadDataset ERROR: Invalid Dataset Id Given: ${id}`,
            );
        } else if (this.loadedInsightDatasets.hasOwnProperty(id)) {
            throw new Error(
                `DatasetLoader.loadDataset ERROR: Dataset with ID '${id}' has already been loaded`,
            );
        }
    }

    // Check that content is a string, not null/undefined or empty string
    private validateDatasetContent(content: string) {
        if (!content) {
            throw new Error(
                `DatasetLoader.loadDataset ERROR: No dataset content given: ${content}`,
            );
        }
    }

    // Load in a courses dataset from Base64Encoded Zip file: !!!
    private loadCoursesDataset(
        id: string,
        content: string,
    ): Promise<InsightCourseDataObject[]> {
        const zip = new JSZip();

        // Unzip the zipped data folder using JSZip
        return zip
            .loadAsync(content, { base64: true })
            .then((zipData) => {
                // Each file in the courses folder produces its own promise when processed
                const csvFileTextPromises: Array<Promise<string>> = [];

                zipData
                    .folder("courses")
                    .forEach(
                        (relativePath: string, file: JSZip.JSZipObject) => {
                            if (relativePath.endsWith(".csv")) {
                                csvFileTextPromises.push(file.async("text"));
                            }
                        },
                    );

                // If we have no valid files in a "courses" folder, invalid dataset
                if (csvFileTextPromises.length === 0) {
                    throw new Error(
                        "DatasetLoader.loadDataset ERROR: Given dataset contained no csv files in 'courses' folder",
                    );
                }

                // Once we have all the text content of the csv files, process it
                return Promise.all(csvFileTextPromises);
            })
            .then((fileTextArr: string[]) => {
                // Process data from each csvFile returned by Promise.all:
                const processedCoursesData: InsightCourseDataObject[] = [];

                fileTextArr.forEach((fileStr: string) => {
                    fileStr.split("\r\n").forEach((rowString, index) => {
                        // Skip first row of each csv file (column header)
                        if (index === 0) {
                            return;
                        }

                        // Check that this row contains the correct number of columns
                        const rowEntries = rowString.split("|");
                        const numCols = rowEntries.length;

                        if (![10, 11].includes(numCols)) {
                            return;
                        }

                        // Process this row into a dataset object, and add it to data array:
                        const courseData: InsightCourseDataObject = {};

                        coursesColNumToQueryKeyTranslator.forEach(
                            ([colNum, queryKey, parseFunc]) => {
                                const objectKey: string = `${id}_${queryKey}`;
                                courseData[objectKey] = parseFunc(
                                    rowEntries[colNum],
                                );
                            },
                        );

                        processedCoursesData.push(courseData);
                    });
                });

                // If there are no valid course sections after processing the dataset, return an error:
                if (processedCoursesData.length === 0) {
                    throw new Error(
                        "DatasetLoader.loadDataset ERROR: Given dataset contains no valid course sections",
                    );
                }

                // Resolve the promise with the processed course dataset:
                return processedCoursesData;
            });
    }
}
