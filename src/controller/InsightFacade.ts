import {
    IInsightFacade,
    InsightResponse,
    InsightDatasetKind,
    InsightCourseDataObject,
    InsightEBNFQuery,
    InsightQueryAST,
} from "./IInsightFacade";

import DatasetLoader from "./DatasetLoader";
import QueryParser from "./QueryParser";
import DatasetQuerier from "./DatasetQuerier";
import Log from "../Util";

/**
 * This is the main programmatic entry point for the project.
 */
export default class InsightFacade implements IInsightFacade {
    private datasetLoader: DatasetLoader;
    private queryParser: QueryParser;
    private datasetQuerier: DatasetQuerier;

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.datasetLoader = new DatasetLoader();
        this.queryParser = new QueryParser();
        this.datasetQuerier = new DatasetQuerier();
    }

    // Initialise the UBC Insight System - Loading any Stored datasets from disk
    public initialise(): Promise<boolean> {
        return this.datasetLoader.loadDatasetsFromDisk();
    }

    public addDataset(
        id: string,
        content: string,
        kind: InsightDatasetKind,
    ): Promise<InsightResponse> {
        return this.datasetLoader.loadDataset(id, content, kind);
    }

    public removeDataset(id: string): Promise<InsightResponse> {
        return this.datasetLoader.deleteDataset(id);
    }

    public performQuery(
        query: string | InsightEBNFQuery,
    ): Promise<InsightResponse> {
        return new Promise((resolve, reject) => {
            // Parse the query, get the relevant dataset and then apply query to data
            try {
                let queryAST: InsightQueryAST;
                if (typeof query === "string") {
                    queryAST = this.queryParser.parseQuery(query);
                } else {
                    query = query as InsightEBNFQuery;
                    queryAST = this.queryParser.translateEBNFQuery(query);
                }

                const dataset: InsightCourseDataObject[] =
                    this.datasetLoader.getDataset(queryAST.id, queryAST.kind);
                const requestedData: InsightCourseDataObject[] =
                    this.datasetQuerier.applyQuery(queryAST, dataset);
                return resolve({
                    code: 200,
                    body: {
                        result: requestedData,
                    },
                });
            } catch (err) {
                return reject({
                    code: 400,
                    body: {
                        error: `InsightFacade.performQuery ERROR: ${err.message}`,
                    },
                });
            }
        });
    }

    public listDatasets(): Promise<InsightResponse> {
        return this.datasetLoader.getLoadedDatasets();
    }
}
