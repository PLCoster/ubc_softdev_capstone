import Log from "../Util";
import {
    IInsightFacade,
    InsightResponse,
    InsightDatasetKind,
} from "./IInsightFacade";
import DatasetLoader from "./DatasetLoader";

/**
 * This is the main programmatic entry point for the project.
 */
export default class InsightFacade implements IInsightFacade {
    private datasetLoader: DatasetLoader;

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.datasetLoader = new DatasetLoader();
    }

    public addDataset(
        id: string,
        content: string,
        kind: InsightDatasetKind,
    ): Promise<InsightResponse> {
        return this.datasetLoader.loadDataset(id, content, kind);
    }

    public removeDataset(id: string): Promise<InsightResponse> {
        return Promise.reject({ code: -1, body: null });
    }

    public performQuery(query: string): Promise<InsightResponse> {
        return Promise.reject({ code: -1, body: null });
    }

    public listDatasets(): Promise<InsightResponse> {
        return Promise.reject({ code: -1, body: null });
    }
}
