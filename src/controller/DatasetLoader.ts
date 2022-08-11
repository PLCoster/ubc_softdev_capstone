import * as JSZip from "jszip";
import { promises as fs } from "fs";
import * as path from "path";
import * as parse5 from "parse5";
import * as http from "http";

import {
    InsightResponse,
    InsightDataset,
    InsightDatasetKind,
    InsightCourseDataObject,
} from "./IInsightFacade";

import Log from "../Util";

// Interface types for parse5 processed XML AST
interface NodeAttribute {
    name: string;
    value: string;
}

interface ASTNode {
    childNodes: ASTNode[];
    nodeName: string;
    attrs?: NodeAttribute[];
}

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

const roomAttrNameToQueryKeyTranslator: {
    [key: string]: [string, (arg1: string, ...args: any[]) => string | number];
} = {
    name: ["fullname", identity],
    id: ["shortname", identity],
    number: ["number", identity],
    shortname_number: ["name", identity],
    address: ["address", identity],
    // !!! lat and lon fields to be added
    seats: ["seats", parseFloat],
    type: ["type", identity],
    furniture: ["furniture", identity],
    link: ["href", identity],
};

export default class DatasetLoader {
    private loadedInsightDatasets: { [key: string]: InsightDataset };
    private datasets: { [key: string]: InsightCourseDataObject[] };
    private cachePath: string;
    private buildingGeoData: { [key: string]: { lat: number; lon: number } };

    constructor() {
        Log.trace("DatasetLoader::init()");
        this.loadedInsightDatasets = {};
        this.datasets = {};
        this.cachePath = path.join(__dirname, "../../.cache/");
        this.buildingGeoData = {};
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

                let processedData: InsightCourseDataObject[];

                if (kind === InsightDatasetKind.Courses) {
                    processedData = await this.loadCoursesDataset(id, content);
                } else {
                    // Load Building GeoData from File if not already loaded, then load rooms dataset
                    await this.loadGeoDataFromFile();
                    processedData = await this.loadRoomsDataset(id, content);
                }

                // Add the dataset summary to loaded Insight datasets:
                this.loadedInsightDatasets[id] = {
                    id,
                    kind,
                    numRows: processedData.length,
                };

                // Store the dataset itself for querying
                this.datasets[id] = processedData;

                Log.trace(
                    `InsightDataset Loaded: ${JSON.stringify(
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
                        JSON.stringify(processedData),
                    );
                }

                // Return success response including dataset info
                return resolve({
                    code: 204,
                    body: {
                        result: [id, kind, processedData.length],
                    },
                });
            } catch (err) {
                Log.trace(`ERROR WHEN LOADING DATASET: ${err.message}`);
                return reject({
                    code: 400,
                    body: {
                        error: err.message,
                    },
                });
            }
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
                `DatasetLoader.getDataset ERROR: Dataset ${id} queried with incorrect KIND ${kind}`,
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

    // Check that dataset kind is valid
    private validateDatasetKind(kind: InsightDatasetKind) {
        if (!Object.values(InsightDatasetKind).includes(kind)) {
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

    private loadRoomsDataset(
        id: string,
        content: string,
    ): Promise<InsightCourseDataObject[]> {
        const zip = new JSZip();
        let allFilesZip: JSZip;

        // Unzip the zipped data folder using JSZip
        return zip
            .loadAsync(content, { base64: true })
            .then(async (zipData) => {
                allFilesZip = zipData;

                // If no index.xml file, throw an error:
                if (!zipData.file("index.xml")) {
                    throw new Error(
                        `DatasetLoader.loadDataset ERROR: Rooms dataset ${id} contains no index.xml file`,
                    );
                }

                // Otherwise load index.xml for processing
                return zipData.file("index.xml").async("text");
            })
            .then((indexText) => {
                // Process index.xml text into AST
                const fileAST = parse5.parse(indexText) as ASTNode;

                // Get to building nodes from index.xml AST
                const buildingsArr =
                    fileAST.childNodes[1].childNodes[1].childNodes[0].childNodes.filter(
                        (node: ASTNode) => node.nodeName === "building",
                    );

                // Get file path and building GeoData for each building
                const buildingFilePromises: Array<Promise<string>> = [];
                const geoDataPromises: Array<
                    Promise<{ address: string; lat: number; lon: number }>
                > = [];
                buildingsArr.forEach((node: ASTNode) => {
                    node.attrs.forEach((attr: NodeAttribute) => {
                        // Generate array of JSZip file load promises for each building
                        if (attr.name === "path") {
                            // Slice off relative path ("./") from filepath
                            const filePath = attr.value.slice(2);
                            buildingFilePromises.push(
                                allFilesZip.file(filePath).async("text"),
                            );
                        }
                    });

                    // Generate array of promises for fetching building GeoData
                    const locationNode = node.childNodes.filter(
                        (childnode: ASTNode) =>
                            childnode.nodeName === "location",
                    )[0];

                    const addressStr = locationNode.attrs.filter(
                        (locAttr: NodeAttribute) => locAttr.name === "address",
                    )[0].value;

                    geoDataPromises.push(
                        this.getBuildingGeolocation(addressStr),
                    );
                });

                // Wait for all geodata fetching and file loading promises to resolve before continuing
                return Promise.all(geoDataPromises).then(() =>
                    Promise.all(buildingFilePromises),
                );
            })
            .then((buildingFilesArr: string[]) => {
                // Process all building xml files to create individual room data objects
                const roomsDataset: InsightCourseDataObject[] = [];

                buildingFilesArr.forEach((buildingFileData: string) => {
                    // Use parse5 to extract room information from each building file:
                    const fileAST = parse5.parse(buildingFileData) as ASTNode;

                    // Get building id, address and name from building xml node
                    const buildingNode =
                        fileAST.childNodes[1].childNodes[1].childNodes[0];

                    const buildingAttrs: InsightCourseDataObject = {};
                    buildingNode.attrs.forEach((attribute) =>
                        this.addAttrToDataObj(attribute, buildingAttrs, id),
                    );

                    // Get array of 'room' nodes from AST
                    const roomsArr =
                        buildingNode.childNodes[1].childNodes.filter(
                            (node: ASTNode) => node.nodeName === "room",
                        );

                    // Create a Dataset Object for each room, add all attributes
                    roomsArr.forEach((node: ASTNode) => {
                        let roomDataObj: InsightCourseDataObject = {};
                        // Get room number from room Node:
                        node.attrs.forEach((attribute) =>
                            this.addAttrToDataObj(attribute, roomDataObj, id),
                        );

                        // Get attributes from web child node of room
                        node.childNodes[1].attrs.forEach((attribute) =>
                            this.addAttrToDataObj(attribute, roomDataObj, id),
                        );

                        // Get attributes from space child node of room
                        node.childNodes[1].childNodes[1].attrs.forEach(
                            (attribute) =>
                                this.addAttrToDataObj(
                                    attribute,
                                    roomDataObj,
                                    id,
                                ),
                        );

                        // Add building attributes to the DataObj
                        roomDataObj = {
                            ...buildingAttrs,
                            ...roomDataObj,
                        };

                        // Create 'name' attribute for DataObj from shortname and number properties
                        this.addAttrToDataObj(
                            {
                                name: "shortname_number",
                                value: `${roomDataObj[`${id}_shortname`]}_${
                                    roomDataObj[`${id}_number`]
                                }`,
                            },
                            roomDataObj,
                            id,
                        );

                        // Add lat and lon GeoData
                        const roomAddress = roomDataObj[`${id}_address`];

                        roomDataObj[`${id}_lat`] =
                            this.buildingGeoData[roomAddress].lat;
                        roomDataObj[`${id}_lon`] =
                            this.buildingGeoData[roomAddress].lon;

                        roomsDataset.push(roomDataObj);
                    });
                });

                // Return complete rooms dataset
                return roomsDataset;
            });
    }

    // Translates AST Node attributes to valid rooms dataset keys, and adds the keys to the given data object
    private addAttrToDataObj(
        { name, value }: NodeAttribute,
        roomDataObj: InsightCourseDataObject,
        id: string,
    ): void {
        if (!roomAttrNameToQueryKeyTranslator.hasOwnProperty(name)) {
            throw new Error(
                `DatasetLoader.loadDataset ERROR: attribute ${name} not expected on rooms dataset node`,
            );
        }
        const [translatedName, valueParser] =
            roomAttrNameToQueryKeyTranslator[name];
        roomDataObj[`${id}_${translatedName}`] = valueParser(value);
    }

    // Loads building GeoData from JSON file if present
    private async loadGeoDataFromFile(): Promise<string> {
        // If we already have GeoData, don't load from file again:
        if (Object.keys(this.buildingGeoData).length > 0) {
            return Promise.resolve("Already Loaded");
        }

        const geoFilePath = path.join(
            __dirname,
            "/helpers/buildingGeoData.json",
        );

        let fileFound = false;
        try {
            // Check if building GeoData file exists:
            await fs.access(geoFilePath);
            fileFound = true;
        } catch (err) {
            // If file does not exist then just return:
            return Promise.resolve("No file to load");
        }

        if (fileFound) {
            // Otherwise load data from the file
            const fileData = await fs.readFile(geoFilePath);
            this.buildingGeoData = JSON.parse(fileData.toString());
            return Promise.resolve("Data Loaded from file");
        }
    }

    // Fetches building Lat and Lon via web API
    private getBuildingGeolocation(
        address: string,
    ): Promise<{ address: string; lat: number; lon: number }> {
        // If we already have the building GeoData, resolve immediately
        if (this.buildingGeoData.hasOwnProperty(address)) {
            return Promise.resolve({
                address,
                ...this.buildingGeoData[address],
            });
        }

        // Otherwise Fetch data via http
        return new Promise((resolve) => {
            const safeAddressString = address.replace(/ /g, "%20");

            const options = {
                hostname: "sdmm.cs.ubc.ca",
                port: 11316,
                path: `/api/v1/team/${safeAddressString}`,
            };

            const req = http.get(options, (res) => {
                if (res.statusCode !== 200) {
                    throw new Error(
                        `DatasetLoader.loadDataset ERROR: Bad status code from GeoData API: ${res.statusCode}`,
                    );
                }

                res.on("data", (d) => {
                    this.buildingGeoData[address] = JSON.parse(d.toString());
                    resolve({ address, ...this.buildingGeoData[address] });
                });
            });

            req.on("error", (err) => {
                throw new Error(
                    `DatasetLoader.loadDataset ERROR: Error occurred when requesting GeoData from API: ${err.message}`,
                );
            });
        });
    }
}
